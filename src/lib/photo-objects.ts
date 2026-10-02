import type { PhotoMask, PhotoPixels } from './photo-model';
import { inferConvexContour, inferSteppedContour } from './photo-contours';

export type PhotoObject = {
  kind: 'box' | 'soap' | 'bottle' | 'jar' | 'general';
  bounds: { x: number; y: number; width: number; height: number };
  color: [number, number, number];
  confidence: number;
  /** Clockwise outline in analysis-image pixel coordinates. */
  contour?: { x: number; y: number }[];
};

const median = (values: number[]) => {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};
const quantile = (values: number[], amount: number) => {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * amount))] ?? 0;
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/**
 * A close crop can leave too little background for flood-fill segmentation.
 * Recover a printed soap carton only when material continues along all four
 * edges, with pale paper on at least three. A white-margin promotional layout,
 * plain colour swatch or busy lifestyle photograph must keep the relief path.
 */
function inferCroppedCarton({ width, height, data }: PhotoPixels): PhotoObject | undefined {
  if (Math.min(width, height) < 24 || width / height < .55 || width / height > 1.65) return;
  const inset = Math.max(1, Math.round(Math.min(width, height) * .01));
  const strip = Math.max(3, Math.round(Math.min(width, height) * .04));
  const rgb = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    return [data[offset], data[offset + 1], data[offset + 2]];
  };
  const material = (c: number[]) => (c[0] + c[1] + c[2]) / 3 < 246;
  const paper = (c: number[]) => material(c) && Math.min(...c) > 145 && Math.max(...c) - Math.min(...c) < 36;
  const regions = [
    [Math.ceil(width * .065), inset, Math.floor(width * .935), inset + strip],
    [width - inset - strip, Math.ceil(height * .065), width - inset, Math.floor(height * .935)],
    [Math.ceil(width * .065), height - inset - strip, Math.floor(width * .935), height - inset],
    [inset, Math.ceil(height * .065), inset + strip, Math.floor(height * .935)],
  ];
  const edges = regions.map(([left, top, right, bottom]) => {
    let covered = 0, pale = 0, count = 0;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      const c = rgb(x, y); covered += +material(c); pale += +paper(c); count++;
    }
    return { coverage: covered / count, paper: pale / count };
  });
  if (edges.some(edge => edge.coverage < .80) || edges.filter(edge => edge.paper > .68).length < 3) return;
  let ink = 0, pale = 0, count = 0;
  const colors: number[][] = [[], [], []];
  for (let y = inset; y < height - inset; y += 2) for (let x = inset; x < width - inset; x += 2) {
    const c = rgb(x, y);
    ink += +(Math.max(...c) < 145);
    if (paper(c)) { pale++; c.forEach((v, i) => colors[i].push(v)); }
    count++;
  }
  if (ink / count < .012 || ink / count > .32 || pale / count < .5) return;
  // Keep actual near-frame edges, trimming only the narrow studio margin. Use
  // many scan lines so a rounded corner or isolated printing cannot set a crop.
  const edgeAt = (side: number) => {
    const length = side % 2 ? width : height, cross = side % 2 ? height : width;
    const stops: number[] = [];
    for (let t = Math.ceil(cross * .15); t < cross * .85; t += 2) {
      for (let d = 0; d <= Math.ceil(length * .06); d++) {
        const at = (delta: number) => side === 0 ? rgb(t, d + delta)
          : side === 1 ? rgb(width - 1 - d - delta, t)
          : side === 2 ? rgb(t, height - 1 - d - delta) : rgb(d + delta, t);
        if ([0, 1, 2].every(delta => material(at(delta)))) { stops.push(d); break; }
      }
    }
    return Math.floor(quantile(stops, .25));
  };
  const [top, right, bottom, left] = [0, 1, 2, 3].map(edgeAt);
  return { kind: 'box', bounds: { x: left, y: top, width: width - left - right, height: height - top - bottom },
    color: colors.map(channel => median(channel) / 255) as [number, number, number], confidence: .82 };
}

/**
 * Infer simple manufactured parts only when the photograph supports them. A long
 * upright face has a stable top and footprint; petals and cast shadows do not.
 * The analysis uses the actual pixels, not a product name or a particular URL.
 */
export function inferPhotoObjects(pixels: PhotoPixels, analysis: PhotoMask, shape = 'general'): PhotoObject[] {
  if (pixels.width !== analysis.width || pixels.height !== analysis.height) return [];
  if (analysis.kind !== 'volume') {
    const carton = shape === 'soap' ? inferCroppedCarton(pixels) : undefined;
    return carton ? [carton] : [];
  }
  if (analysis.confidence < .75) return [];
  const { width, height, data } = pixels;
  const { mask, bounds } = analysis;
  const rgb = (x: number, y: number) => {
    const offset = (clamp(Math.round(y), 0, height - 1) * width + clamp(Math.round(x), 0, width - 1)) * 4;
    return [data[offset], data[offset + 1], data[offset + 2]];
  };
  const rowCount = new Float32Array(height);
  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) rowCount[y] += mask[y * width + x];
  }
  // A percentile, rather than the largest row, ignores a wide cast shadow.
  const peak = quantile(Array.from(rowCount).filter(n => n > 0), .78);
  let runStart = -1, mainTop = 0, mainBottom = 0;
  for (let y = bounds.y; y <= bounds.y + bounds.height; y++) {
    if (y < height && rowCount[y] >= peak * .70) { if (runStart < 0) runStart = y; }
    else if (runStart >= 0) {
      if (y - runStart > mainBottom - mainTop) { mainTop = runStart; mainBottom = y; }
      runStart = -1;
    }
  }
  const mainHeight = mainBottom - mainTop;
  if (mainHeight < height * .19 || peak < width * .16) return [];
  const coreTop = Math.round(mainTop + mainHeight * .22);
  const coreBottom = Math.round(mainTop + mainHeight * .66);
  const occupied = new Uint8Array(width);
  const columnCoverage = new Float32Array(width);
  for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
    let count = 0;
    for (let y = coreTop; y < coreBottom; y++) count += mask[y * width + x];
    columnCoverage[x] = count / Math.max(1, coreBottom - coreTop);
    occupied[x] = count >= (coreBottom - coreTop) * .92 ? 1 : 0;
  }
  const spans: [number, number][] = [];
  let start = -1;
  for (let x = 0; x <= width; x++) {
    if (x < width && occupied[x]) { if (start < 0) start = x; }
    else if (start >= 0) { if (x - start >= mainHeight * .23) spans.push([start, x]); start = -1; }
  }
  if (!spans.length || spans.length > 4) return [];
  for (const span of spans) {
    while (span[0] > 0 && columnCoverage[span[0] - 1] >= .35) span[0]--;
    while (span[1] < width && columnCoverage[span[1]] >= .35) span[1]++;
  }

  const topAt = (x: number) => {
    // Ignore tiny disconnected pixels above the face.
    for (let y = bounds.y; y <= coreTop; y++) {
      if (mask[y * width + x] && mask[(Math.min(y + 2, height - 1)) * width + x] && mask[(Math.min(y + 5, height - 1)) * width + x]) return y;
    }
    return coreTop;
  };
  const profile = new Float32Array(width);
  for (const [left, right] of spans) for (let x = left; x < right; x++) profile[x] = topAt(x);

  const sample = (left: number, right: number, top = coreTop, bottom = coreBottom) => {
    const colors: number[][] = [[], [], []];
    let pale = 0, saturated = 0, ink = 0, count = 0;
    const stride = Math.max(1, Math.round((right - left) / 50));
    for (let y = top; y < bottom; y += stride) for (let x = left; x < right; x += stride) {
      const color = rgb(x, y), hi = Math.max(...color), lo = Math.min(...color);
      if (hi - lo < 37 && (color[0] + color[1] + color[2]) / 3 > 150) pale++;
      if (hi - lo > 45) saturated++;
      if ((color[0] + color[1] + color[2]) / 3 < 145) ink++;
      color.forEach((v, c) => colors[c].push(v)); count++;
    }
    return { color: colors.map(c => median(c) / 255) as [number, number, number], pale: pale / Math.max(1, count), saturated: saturated / Math.max(1, count), ink: ink / Math.max(1, count) };
  };

  // A lone convex object can supply its own outline without any catalogue shape
  // label. Keep the entire outline (including a circle's top and bottom arcs),
  // and require a stable centre so adjacent products cannot become one oval.
  if ((shape === 'general' || shape === 'soap') && spans.length === 1) {
    const centres: number[] = [];
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      if (rowCount[y] < peak * .40) continue;
      let l = width, r = -1;
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) if (mask[y * width + x]) { l = Math.min(l, x); r = x; }
      centres.push((l + r) / 2);
    }
    if (centres.length > 8 && quantile(centres, .98) - quantile(centres, .02) < bounds.width * .055) {
      const contour = inferConvexContour(analysis, bounds);
      if (contour) return [{ kind: shape === 'soap' ? 'soap' : 'general', bounds: { ...bounds }, contour, color: sample(...spans[0]).color, confidence: analysis.confidence * .89 }];
    }
  }

  // Curved vessels retain their original silhouette. Replacing a cap or shoulders
  // with the central rectangular band would be a less faithful reconstruction.
  if (shape !== 'soap' && shape !== 'general') {
    if (!['bottle', 'jar'].includes(shape) || spans.length !== 1) return [];
    const [left, right] = spans[0];
    const vesselBounds = { ...bounds };
    let isolatedBottle = false;
    if (shape === 'bottle' && bounds.height > bounds.width * 1.2) {
      const lefts: number[] = [], rights: number[] = [], capCentres: number[] = [], capWidths: number[] = [];
      for (let y = bounds.y; y < bounds.y + bounds.height * .43; y++) {
        let l = width, r = -1;
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) if (mask[y * width + x]) { l = Math.min(l, x); r = x; }
        if (r < l) continue;
        if (y < bounds.y + bounds.height * .14) { capCentres.push((l + r) / 2); capWidths.push(r - l + 1); }
        if (y > bounds.y + bounds.height * .23) { lefts.push(l); rights.push(r); }
      }
      const l = Math.round(quantile(lefts, .60)), r = Math.round(quantile(rights, .40));
      const bodyWidth = r - l + 1, centre = (l + r) / 2;
      if (bodyWidth > bounds.width * .28 && bodyWidth <= bounds.width && bounds.height > bodyWidth * 2
        && Math.abs(median(capCentres) - centre) < bodyWidth * .15 && median(capWidths) < bodyWidth * .87) {
        const starts: number[] = [], ends: number[] = [];
        for (let x = Math.round(centre - bodyWidth * .20); x < centre + bodyWidth * .20; x++) {
          let first = height, last = -1;
          for (let y = bounds.y; y < bounds.y + bounds.height; y++) if (mask[y * width + x]) { first = Math.min(first, y); last = y; }
          if (last >= first) { starts.push(first); ends.push(last); }
        }
        vesselBounds.x = l; vesselBounds.width = bodyWidth;
        vesselBounds.y = Math.round(median(starts));
        vesselBounds.height = Math.round(median(ends)) - vesselBounds.y + 1;
        isolatedBottle = true;
      }
    }
    if (shape === 'jar') {
      // On a studio photograph, the neutral metal/glass perimeter is distinct
      // from coloured herbs, fruit and powders. Require a broad coherent lid;
      // scattered ingredient pixels cannot establish the vessel's bounds.
      const rows: { y: number; left: number; right: number; count: number }[] = [];
      for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
        let l = width, r = -1, count = 0;
        const runs: { left: number; right: number; count: number }[] = [];
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
          if (!mask[y * width + x]) continue;
          const color = rgb(x, y), lightness = (color[0] + color[1] + color[2]) / 3;
          if (Math.max(...color) - Math.min(...color) > 40 || lightness > 243 || lightness < 65) continue;
          l = Math.min(l, x); r = Math.max(r, x); count++;
          const previous = runs[runs.length - 1];
          if (previous && x - previous.right <= 3) { previous.right = x; previous.count++; }
          else runs.push({ left: x, right: x, count: 1 });
        }
        const coherent = runs.reduce<{ left: number; right: number; count: number } | undefined>((best, run) => !best || run.count > best.count ? run : best, undefined);
        // A leaf's pale veins and its shadow can pass a neutral-colour filter.
        // Use the broad coherent metal/glass run instead of the furthest fleck.
        // Keep both rim edges when a coloured central label splits the face.
        if (coherent && coherent.right - coherent.left > (r - l) * .55) { l = coherent.left; r = coherent.right; }
        rows.push({ y, left: l, right: r, count });
      }
      const peakNeutral = quantile(rows.slice(0, Math.ceil(rows.length * .70)).map(row => row.count), .85);
      const substantial = rows.filter(row => row.count > Math.max(12, peakNeutral * .40));
      if (substantial.length > bounds.height * .35 && peakNeutral > bounds.width * .25) {
        const topRow = substantial[0].y;
        const lidRows = substantial.filter(row => row.y < topRow + bounds.height * .43 && row.count > peakNeutral * .60);
        if (lidRows.length >= 5) {
          const l = Math.round(quantile(lidRows.map(row => row.left), .25));
          const r = Math.round(quantile(lidRows.map(row => row.right), .75));
          const centres = lidRows.map(row => (row.left + row.right) / 2);
          const stableCentre = quantile(centres, .80) - quantile(centres, .20) < (r - l) * .10;
          const productWidth = r - l + 1;
          if (stableCentre && productWidth > bounds.width * .50 && productWidth < bounds.width * .86) {
            const top = Math.max(bounds.y, topRow - 2);
            const bottomRows = rows.filter(row => row.y > top + bounds.height * .40 && row.count >= peakNeutral * .40 && row.left < r && row.right > l);
            let bottom = bottomRows[bottomRows.length - 1]?.y ?? bounds.y + bounds.height - 1;
            // Warm powder seen through glass can be more colourful than the
            // neutral rim. Do not mistake the last grey row for the jar base.
            // Recover only a continuous central band matching that pale warm
            // material; dark bowls and vivid herbs/powders cannot extend it.
            const innerLeft = Math.ceil(l + productWidth * .30), innerRight = Math.floor(l + productWidth * .70);
            let warm = 0, sampled = 0;
            for (let y = Math.max(top, bottom - 6); y < bottom - 1; y++) for (let x = innerLeft; x <= innerRight; x++) {
              const c = rgb(x, y);
              warm += +(c[0] >= c[1] && c[1] >= c[2] && c[0] - c[2] > 40 && c[0] - c[2] < 80 && c[2] > 110);
              sampled++;
            }
            if (sampled && warm / sampled > .45) {
              let gap = 0;
              const limit = Math.min(bounds.y + bounds.height, bottom + productWidth * .4);
              for (let y = bottom + 1; y < limit && gap < 3; y++) {
                let supported = 0;
                for (let x = innerLeft; x <= innerRight; x++) {
                  const c = rgb(x, y), lightness = (c[0] + c[1] + c[2]) / 3;
                  supported += +(mask[y * width + x] && Math.max(...c) - Math.min(...c) < 80 && Math.min(...c) > 110 && lightness < 243);
                }
                if (supported >= Math.max(8, productWidth * .15)) { bottom = y; gap = 0; }
                else gap++;
              }
            }
            if (bottom - top > productWidth * .55) {
              vesselBounds.x = l; vesselBounds.width = productWidth;
              vesselBounds.y = top; vesselBounds.height = bottom - top + 1;
            }
          }
        }
      }
    }
    if (vesselBounds.width > (right - left) * 1.22 || !isolatedBottle && vesselBounds.height > mainHeight * 2.0) return [];
    // A shallow tin photographed from above has a symmetric lid. Its upper arc
    // gives a steadier centre than a pale cast shadow joined to the lower body.
    // Restrict this correction to a small, neutral, one-sided tail; upright
    // bottles and asymmetric or colourful accessories retain their full bounds.
    if (shape === 'jar' && bounds.width / bounds.height > 1.2) {
      const centres: number[] = [];
      for (let y = Math.ceil(bounds.y + bounds.height * .05); y < bounds.y + bounds.height * .23; y++) {
        let rowLeft = width, rowRight = -1;
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) if (mask[y * width + x]) { rowLeft = Math.min(rowLeft, x); rowRight = x; }
        if (rowRight - rowLeft > bounds.width * .32) centres.push((rowLeft + rowRight) / 2);
      }
      if (centres.length >= 4) {
        const centre = median(centres), deviation = median(centres.map(value => Math.abs(value - centre)));
        const leftRadius = centre - bounds.x, rightRadius = bounds.x + bounds.width - 1 - centre;
        const difference = Math.abs(leftRadius - rightRadius);
        if (deviation < bounds.width * .015 && difference > bounds.width * .055 && difference < bounds.width * .15) {
          const trimLeft = leftRadius > rightRadius;
          const newLeft = trimLeft ? Math.round(centre - rightRadius) : bounds.x;
          const newRight = trimLeft ? bounds.x + bounds.width : Math.round(centre + leftRadius + 1);
          let tailCount = 0, neutral = 0;
          const x0 = trimLeft ? bounds.x : newRight, x1 = trimLeft ? newLeft : bounds.x + bounds.width;
          for (let y = bounds.y; y < bounds.y + bounds.height; y++) for (let x = x0; x < x1; x++) {
            if (!mask[y * width + x]) continue;
            const color = rgb(x, y);
            tailCount++;
            if (Math.max(...color) - Math.min(...color) < 24 && (color[0] + color[1] + color[2]) / 3 > 135) neutral++;
          }
          if (tailCount > 0 && neutral / tailCount > .92) {
            vesselBounds.x = newLeft; vesselBounds.width = newRight - newLeft;
          }
        }
      }
    }
    const contour = shape === 'bottle' ? inferSteppedContour(analysis, vesselBounds) : undefined;
    return [{ kind: shape as 'bottle' | 'jar', bounds: vesselBounds, color: sample(vesselBounds.x, vesselBounds.x + vesselBounds.width).color, confidence: analysis.confidence * .87, ...(contour ? { contour } : {}) }];
  }

  const objects: PhotoObject[] = [];
  for (const [left, right] of spans) {
    const spanWidth = right - left;
    const window = Math.max(4, Math.round(spanWidth * .045));
    let split = -1, bestScore = 0;
    const minWidth = Math.max(spanWidth * .23, mainHeight * .26);
    for (let x = Math.ceil(left + minWidth); x < right - minWidth; x++) {
      const lTop = median(Array.from(profile.slice(x - window, x)));
      const rTop = median(Array.from(profile.slice(x, x + window)));
      const step = Math.abs(lTop - rTop);
      if (step < mainHeight * .045 || step > mainHeight * .62) continue;
      const differences: number[] = [];
      const reach = Math.max(2, Math.round(width / 180));
      for (let y = coreTop; y < coreBottom; y += 3) {
        const a = rgb(x - reach, y), b = rgb(x + reach, y);
        differences.push(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      }
      const edge = median(differences);
      if (edge < 25) continue;
      const a = sample(left + window, x - window), b = sample(x + window, right - window);
      // A label printed on a single bar must not become a separate solid.
      const complementary = a.pale > .48 && b.saturated > .58 || b.pale > .48 && a.saturated > .58;
      const distinctLevels = step > mainHeight * .14 && edge > 32
        && (a.pale > .45 || b.pale > .45)
        && (Math.abs(a.ink - b.ink) > .015 || Math.abs(a.color[0] - b.color[0]) + Math.abs(a.color[1] - b.color[1]) + Math.abs(a.color[2] - b.color[2]) > .12);
      if (!complementary && !distinctLevels) continue;
      const score = step / mainHeight * 170 + Math.min(edge, 95) * .20;
      if (score > bestScore) { bestScore = score; split = x; }
    }
    const parts: [number, number][] = split >= 0 ? [[left, split], [split, right]] : [[left, right]];
    for (const [partLeft, partRight] of parts) {
      const partWidth = partRight - partLeft;
      const inset = Math.max(2, Math.round(partWidth * .09));
      const top = Math.round(median(Array.from(profile.slice(partLeft + inset, partRight - inset))));
      // The bottom of the stable upright band excludes loose petals. Refine that
      // edge from a majority of columns, so an overlapping prop cannot extend it.
      const bottoms: number[] = [];
      for (let x = partLeft + inset; x < partRight - inset; x += 2) {
        let best = mainBottom, strongest = 0;
        for (let y = Math.max(coreBottom, mainBottom - Math.round(mainHeight * .065)); y < Math.min(height - 2, mainBottom + 3); y++) {
          const a = rgb(x, y - 1), b = rgb(x, y + 2);
          const increase = (b[0] + b[1] + b[2] - a[0] - a[1] - a[2]) / 3;
          if (increase > strongest) { strongest = increase; best = y; }
        }
        if (strongest > 12) bottoms.push(best);
      }
      const bottom = bottoms.length >= partWidth * .13 ? Math.round(median(bottoms)) : mainBottom - 1;
      const partHeight = bottom - top;
      if (partHeight < height * .19 || partWidth / partHeight < .32 || partWidth / partHeight > 2.15) return [];
      const appearance = sample(partLeft + inset, partRight - inset);
      // A cream-coloured bare soap is not automatically a cardboard carton.
      // Printed contrast or a complementary taller carton/bar pair is required.
      const objectBounds = { x: partLeft, y: top, width: partWidth, height: partHeight };
      const contour = inferConvexContour(analysis, objectBounds, parts.length > 1 ? partLeft === left ? 'left' : 'right' : 'both');
      const kind = !contour && appearance.pale > .52 && (appearance.ink > .018 || parts.length > 1) ? 'box' : shape === 'soap' ? 'soap' : 'general';
      // In a lone ambiguous composition, keep the original conservative relief.
      if (parts.length === 1 && spans.length === 1 && bounds.width > spanWidth * 1.45) return [];
      objects.push({ kind, bounds: objectBounds, color: appearance.color, confidence: clamp(analysis.confidence * (split >= 0 ? .94 : .86), 0, .96), ...(contour ? { contour } : {}) });
    }
  }
  return objects;
}
