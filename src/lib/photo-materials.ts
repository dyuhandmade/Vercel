/** Inferred, unprinted material for surfaces that a single product photo cannot show. */
export type InferredSurfaceKind = 'box' | 'soap' | 'bottle' | 'jar' | 'general';
export type PhotoRegion = { x: number; y: number; width: number; height: number };
export type SurfaceColor = [number, number, number];
export type InferredSurface = {
  back: HTMLCanvasElement;
  side: HTMLCanvasElement;
  roughness: number;
  metalness: number;
  bump?: HTMLCanvasElement;
};
export type VesselPhotoProfile = {
  lidTop: number;
  lidBottom: number;
  bodyTop: number;
  bodyBottom: number;
  lidEllipse?: { x: number; y: number; width: number; height: number };
  depthShift?: number;
  bodyRadiusRatio?: number;
  bodyTopCurve?: number;
  bodyBottomCurve?: number;
};
export type VesselTextures = {
  body: HTMLCanvasElement;
  lid: HTMLCanvasElement;
  top: HTMLCanvasElement;
  bottom: HTMLCanvasElement;
  bodyRoughness: number;
  bodyMetalness: number;
  lidRoughness: number;
  lidMetalness: number;
};

type RGB = [number, number, number];
type Sample = { data: Uint8ClampedArray; width: number; height: number };
const SIZE = 384;
const clamp = (value: number, min = 0, max = 255) => Math.min(max, Math.max(min, value));
const luminance = (c: RGB) => c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
const saturation = (c: RGB) => Math.max(...c) - Math.min(...c);
const blend = (a: RGB, b: RGB, amount: number): RGB => a.map((v, i) => v + (b[i] - v) * amount) as RGB;

function canvas(width = SIZE, height = SIZE) {
  const result = document.createElement('canvas');
  result.width = width; result.height = height;
  const context = result.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The product material canvas is unavailable.');
  return { result, context };
}

function sourcePixels(photo: HTMLImageElement, region: PhotoRegion): Sample | undefined {
  const { result, context } = canvas(128, 128);
  const x = clamp(region.x, 0, .9999), y = clamp(region.y, 0, .9999);
  const width = clamp(region.width, .0001, 1 - x), height = clamp(region.height, .0001, 1 - y);
  try {
    context.drawImage(photo, x * photo.naturalWidth, y * photo.naturalHeight,
      width * photo.naturalWidth, height * photo.naturalHeight, 0, 0, result.width, result.height);
    return { data: context.getImageData(0, 0, result.width, result.height).data, width: result.width, height: result.height };
  } catch {
    // A missing/CORS-blocked source must not turn an otherwise usable model into an error.
    return undefined;
  }
}

function pixelsIn(sample: Sample | undefined, left: number, top: number, right: number, bottom: number) {
  const values: RGB[] = [];
  if (!sample) return values;
  for (let y = Math.floor(top * sample.height); y < Math.ceil(bottom * sample.height); y += 2) {
    for (let x = Math.floor(left * sample.width); x < Math.ceil(right * sample.width); x += 2) {
      const offset = (clamp(y, 0, sample.height - 1) * sample.width + clamp(x, 0, sample.width - 1)) * 4;
      if (sample.data[offset + 3] < 220) continue;
      values.push([sample.data[offset], sample.data[offset + 1], sample.data[offset + 2]]);
    }
  }
  return values;
}

/** A colour cluster is less vulnerable to printed text or a tiny highlight than an average. */
function dominant(values: RGB[], fallback: RGB, preference: 'paper' | 'body' | 'neutral' = 'neutral'): RGB {
  if (!values.length) return fallback;
  const buckets = new Map<string, { values: RGB[]; weight: number }>();
  for (const c of values) {
    const lum = luminance(c), chroma = saturation(c);
    // Black is a real material for caps; only ignore ink when choosing paper/soap palettes.
    if (lum < 8 && preference !== 'neutral') continue;
    const key = c.map(v => Math.floor(v / 24)).join(',');
    const bucket = buckets.get(key) || { values: [], weight: 0 };
    const paperWeight = preference === 'paper' && lum > 125 && chroma < 45 ? 2.7 : 1;
    const bodyWeight = preference === 'body' && chroma > 24 && lum > 30 ? 1.8 : 1;
    bucket.weight += paperWeight * bodyWeight; bucket.values.push(c); buckets.set(key, bucket);
  }
  const ordered = [...buckets.values()].sort((a, b) => b.weight - a.weight);
  if (!ordered.length) return fallback;
  // Include neighbouring tones so a photograph's gentle lighting isn't quantised into the model.
  const seed = ordered[0].values[0];
  const close = values.filter(c => c.every((v, i) => Math.abs(v - seed[i]) < 35));
  return [0, 1, 2].map(channel => {
    const sorted = close.map(c => c[channel]).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? fallback[channel];
  }) as RGB;
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function texture(base: RGB | ((y: number) => RGB), seed: number, grain: number, kind: InferredSurfaceKind, bump = false) {
  const { result, context } = canvas();
  const output = context.createImageData(SIZE, SIZE);
  const random = seededRandom(seed);
  const wave = Array.from({ length: 49 }, () => random() * 2 - 1);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const c = typeof base === 'function' ? base(y / (SIZE - 1)) : base;
    const fine = (random() + random() + random() - 1.5) * grain;
    const low = wave[Math.floor(y / 64) * 7 + Math.floor(x / 64)] * grain * .25;
    const pore = kind === 'soap' && random() > .982 ? -grain * 2.3 : 0;
    const fiber = kind === 'box' ? Math.sin(x * .3 + Math.sin(y * .035)) * .36 : 0;
    const variation = fine + low + pore + fiber;
    for (let channel = 0; channel < 3; channel++) output.data[i + channel] = clamp((bump ? 128 : c[channel]) + variation);
    output.data[i + 3] = 255;
  }
  context.putImageData(output, 0, 0);
  return { result, context };
}

type CartonBand = { top: number; bottom: number; color: RGB };

function cartonAccent(sample: Sample | undefined, paper: RGB): CartonBand | undefined {
  if (!sample) return;
  const rows: { row: number; values: RGB[] }[] = [];
  for (let y = Math.floor(sample.height * .72); y < sample.height * .985; y++) {
    const values = pixelsIn(sample, .06, y / sample.height, .94, (y + 1) / sample.height);
    const coloured = values.filter(c => saturation(c) > 30 && luminance(c) > 45 && luminance(c) < 230
      && Math.sqrt(c.reduce((sum, v, channel) => sum + (v - paper[channel]) ** 2, 0)) > 45);
    if (coloured.length >= values.length * .38) { rows.push({ row: y, values: coloured }); continue; }
    // Charcoal, forest-green and burgundy footers are darker than the usual
    // colour threshold. Require a solid strip, rather than sparse printed text.
    const dark=values.filter(c=>luminance(c)<70 && luminance(paper)-luminance(c)>85);
    if(dark.length>=values.length*.65){rows.push({row:y,values:dark});continue;}
    // Pale beige/lilac packaging can be close to the paper's brightness. Detect
    // a broad change in tint independently of illumination, so a grey shadow
    // or a crease cannot turn into a printed band on the inferred reverse.
    const tinted = values.filter(c => {
      const light=luminance(c);
      if(light<70||light>247)return false;
      const illumination=light/Math.max(1,luminance(paper));
      const tint=c.map((channel,i)=>channel-paper[i]*illumination);
      return Math.max(...tint)-Math.min(...tint)>7 && Math.hypot(...tint)>6;
    });
    if(tinted.length>=values.length*.65)rows.push({row:y,values:tinted});
  }
  const bands: typeof rows[] = [];
  // Light lettering can interrupt a dark footer for several sampled rows.
  // Bridge a small text-height gap, keeping the broad-row and consistent-color
  // requirements so sparse labels and cast shadows still cannot become a band.
  const maximumGap = Math.max(3, Math.ceil(sample.height * .035));
  for (const row of rows) {
    const previous = bands[bands.length - 1];
    if (previous && row.row - previous[previous.length - 1].row <= maximumGap) previous.push(row);
    else bands.push([row]);
  }
  const band = bands.sort((a, b) => b.length - a.length)[0];
  if (!band || band.length < Math.max(3, sample.height * .025)) return;
  const top = band[0].row / sample.height, bottom = (band[band.length - 1].row + 1) / sample.height;
  if (bottom - top > .22) return;
  const values = band.flatMap(row => row.values), color = dominant(values, paper, 'body');
  const consistent = values.filter(c => Math.sqrt(c.reduce((sum, v, channel) => sum + (v - color[channel]) ** 2, 0)) < 55).length;
  return consistent > values.length * .7 ? { top, bottom, color } : undefined;
}

function paperStructure(context: CanvasRenderingContext2D, color: RGB, side: boolean, accent?: CartonBand) {
  const pixels = context.getImageData(0, 0, SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const u = x / (SIZE - 1), v = y / (SIZE - 1), i = (y * SIZE + x) * 4;
    // Tucked end flaps and a rear glue overlap have a small, broad paper-on-paper shadow.
    let shade = v < .075 ? 5 * (1 - v / .075) : v > .933 ? 5 * (v - .933) / .067 : 0;
    if (!side && v > .075 && v < .933) {
      if (u > .925) shade += 4.5;
      shade += 10 * Math.exp(-(((u - .925) / .009) ** 2));
    }
    if (!side && (v < .075 || v > .933) && (u < .1 || u > .9)) shade += 4;
    for (let channel = 0; channel < 3; channel++) {
      const paperGrain = pixels.data[i + channel] - color[channel];
      const base = accent && v >= accent.top && v <= accent.bottom ? accent.color[channel] + paperGrain : pixels.data[i + channel];
      pixels.data[i + channel] = clamp(base - shade);
    }
  }
  context.putImageData(pixels, 0, 0);
}

function paperSeams(context: CanvasRenderingContext2D, color: RGB, side: boolean) {
  // These are structural carton folds, not invented printing on the unobserved rear.
  const dark = color.map(v => clamp(v - 58));
  const light = color.map(v => clamp(v + 14));
  const crease = (points: [number, number][], strength = .4) => {
    context.strokeStyle = `rgba(${dark.join(',')},${strength})`;
    context.lineWidth = 2;
    context.beginPath(); points.forEach(([x, y], index) => index ? context.lineTo(x * SIZE, y * SIZE) : context.moveTo(x * SIZE, y * SIZE)); context.stroke();
    context.strokeStyle = `rgba(${light.join(',')},.62)`;
    context.translate(0, 1.5); context.stroke(); context.translate(0, -1.5);
  };
  crease([[.025, .075], [.975, .075]], .64);
  crease([[.025, .933], [.975, .933]], .66);
  if (!side) {
    crease([[.925, .075], [.925, .933]], .62);
    crease([[.025, .015], [.105, .075]], .53);
    crease([[.975, .015], [.895, .075]], .53);
    crease([[.025, .985], [.105, .933]], .53);
    crease([[.975, .985], [.895, .933]], .53);
  }
}

/** Reads a small uniform soap area, avoiding the label/background without copying that artwork. */
function soapMaterial(sample: Sample | undefined, fallback: RGB) {
  const all = pixelsIn(sample, .1, .12, .9, .88);
  const base = dominant(all, fallback, 'body');
  const similar = all.filter(c => c.every((v, i) => Math.abs(v - base[i]) < 27));
  const meanDeviation = similar.length ? similar.reduce((sum, c) => sum + Math.abs(luminance(c) - luminance(base)), 0) / similar.length : 3;
  return { base, grain: clamp(meanDeviation * 1.1, 2.5, 8.5) };
}

function containerProfile(sample: Sample | undefined, fallback: RGB) {
  // Find the actual silhouette on each row. Fixed photo strips sample backdrop above a
  // shoulder or beside a narrow cap, incorrectly turning black caps into white material.
  const corners = [
    ...pixelsIn(sample, 0, 0, .065, .065), ...pixelsIn(sample, .935, 0, 1, .065),
    ...pixelsIn(sample, 0, .935, .065, 1), ...pixelsIn(sample, .935, .935, 1, 1),
  ];
  const backdrop = dominant(corners, [248, 248, 248]);
  const difference = (c: RGB) => Math.sqrt(c.reduce((total, v, channel) => total + (v - backdrop[channel]) ** 2, 0));
  const rows: RGB[] = [];
  const count = 48;
  for (let i = 0; i < count; i++) {
    const top = i / count, bottom = (i + 1) / count;
    let left = .1, right = .9;
    if (sample) {
      const foreground: number[] = [];
      for (let x = 0; x < sample.width; x++) {
        const column = pixelsIn(sample, x / sample.width, top, (x + 1) / sample.width, bottom);
        if (column.filter(c => difference(c) > 22 || luminance(c) < 55).length >= Math.max(1, column.length * .6)) foreground.push(x);
      }
      if (foreground.length >= sample.width * .12) {
        left = foreground[0] / sample.width;
        right = (foreground[foreground.length - 1] + 1) / sample.width;
      }
    }
    const span = right - left;
    // Stay within the object's flanks but outside the central printed label.
    let candidates = [
      ...pixelsIn(sample, left + span * .055, top, left + span * .17, bottom),
      ...pixelsIn(sample, right - span * .17, top, right - span * .055, bottom),
    ];
    const foregroundCandidates = candidates.filter(c => difference(c) > 22 || luminance(c) < 55);
    if (foregroundCandidates.length >= 3) candidates = foregroundCandidates;
    else {
      const centre = pixelsIn(sample, left + span * .3, top, right - span * .3, bottom)
        .filter(c => difference(c) > 22 || luminance(c) < 55);
      if (centre.length >= 3) candidates = centre;
    }
    rows.push(dominant(candidates, rows[rows.length - 1] || fallback, 'neutral'));
  }
  return (position: number): RGB => {
    const scaled = clamp(position, 0, 1) * (rows.length - 1), index = Math.floor(scaled);
    const a = rows[index], b = rows[Math.min(index + 1, rows.length - 1)];
    return blend(a, b, scaled - index);
  };
}

function capRidges(context: CanvasRenderingContext2D, profile: (y: number) => RGB) {
  // Only add a subtle grip when the source actually shows a contrasting upper cap.
  const top = profile(.13), body = profile(.6);
  if (Math.abs(luminance(top) - luminance(body)) < 35) return;
  let capEnd = .15;
  while (capEnd < .35 && Math.abs(luminance(profile(capEnd)) - luminance(top)) < 22) capEnd += .015;
  context.save();
  context.strokeStyle = 'rgba(0,0,0,.11)'; context.lineWidth = .65;
  for (let x = 3; x < SIZE; x += 5.5) {
    context.beginPath(); context.moveTo(x, SIZE * .035); context.lineTo(x, SIZE * capEnd); context.stroke();
  }
  context.restore();
}

/**
 * Crop the actual front artwork. A plain soap bar can have decorative petals laid across its
 * lower edge: replace only boundary-connected, strongly different colours with nearby bar grain.
 * Printed packaging and general photographs are never retouched by this inference.
 */
export function createObjectFront(photo: HTMLImageElement, region: PhotoRegion, kind: string, color: SurfaceColor): HTMLCanvasElement {
  const sx = clamp(region.x, 0, .9999) * photo.naturalWidth;
  const sy = clamp(region.y, 0, .9999) * photo.naturalHeight;
  const sw = clamp(region.width, .0001, 1 - region.x) * photo.naturalWidth;
  const sh = clamp(region.height, .0001, 1 - region.y) * photo.naturalHeight;
  const scale = Math.min(1, 1024 / Math.max(sw, sh));
  const { result, context } = canvas(Math.max(2, Math.round(sw * scale)), Math.max(2, Math.round(sh * scale)));
  context.drawImage(photo, sx, sy, sw, sh, 0, 0, result.width, result.height);
  if (kind !== 'soap') return result;
  let pixels: ImageData;
  try { pixels = context.getImageData(0, 0, result.width, result.height); } catch { return result; }
  const { width, height, data } = pixels;
  const sample = { width, height, data };
  const central = pixelsIn(sample, .2, .18, .8, .66);
  const fallback = color.map(v => clamp(v * 255)) as RGB;
  const base = dominant(central, fallback, 'body');
  const difference = (c: RGB) => {
    const sum = c[0] + c[1] + c[2] + 1, baseSum = base[0] + base[1] + base[2] + 1;
    return Math.sqrt(c.reduce((value, channel, i) => value + (channel / sum - base[i] / baseSum) ** 2, 0));
  };
  // A marbled or labelled face is not a reliable source for this targeted repair.
  const homogeneous = central.filter(c => difference(c) < .055 && Math.abs(luminance(c) - luminance(base)) < 42).length / Math.max(1, central.length);
  if (homogeneous < .64) return result;
  const anomalous = new Uint8Array(width * height);
  const connected = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  const startY = Math.floor(height * .75);
  for (let y = startY; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x, offset = i * 4;
    const c: RGB = [data[offset], data[offset + 1], data[offset + 2]];
    const chromatic = difference(c);
    const absolute = Math.sqrt(c.reduce((sum, value, channel) => sum + (value - base[channel]) ** 2, 0));
    // Strong edge seeds identify a prop. Weaker connected colours include its softly lit fringe.
    // Weak outliers alone cannot remove natural veins or pale inclusions in the soap.
    const strong = (chromatic > .067 && absolute > 49) || (absolute > 115 && luminance(c) > luminance(base) + 42);
    if (strong || (chromatic > .033 && absolute > 29)) anomalous[i] = 1;
    if (strong && (x === 0 || x === width - 1 || y === height - 1)) { connected[i] = 1; queue[tail++] = i; }
  }
  while (head < tail) {
    const i = queue[head++], x = i % width, y = Math.floor(i / width);
    for (const next of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > startY ? i - width : -1, y < height - 1 ? i + width : -1]) {
      if (next >= 0 && anomalous[next] && !connected[next]) { connected[next] = 1; queue[tail++] = next; }
    }
  }
  if (tail < width * height * .001 || tail > width * height * .23) return result;
  // Antialiased prop edges can approach the bar's colour. Cover that narrow transition before
  // feathering, otherwise magenta fringes remain visible when the texture bends around a bevel.
  const repaired = connected.slice();
  const edgeRadius = Math.round(clamp(width * .007, 2, 5));
  for (let index = 0; index < tail; index++) {
    const i = queue[index], x = i % width, y = Math.floor(i / width);
    for (let dy = -edgeRadius; dy <= edgeRadius; dy++) for (let dx = -edgeRadius; dx <= edgeRadius; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < width && yy >= startY && yy < height) repaired[yy * width + xx] = 1;
    }
  }
  const original = new Uint8ClampedArray(data);
  for (let y = startY; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    // A two-pixel feather stops the inferred patch from ending in a hard sticker edge.
    let amount = repaired[i] ? 1 : 0;
    if (!amount) {
      let neighbours = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < width && yy >= startY && yy < height) neighbours += repaired[yy * width + xx];
      }
      amount = neighbours / 25;
    }
    if (!amount) continue;
    const donorX = Math.round(clamp(x, width * .12, width * .88));
    const donorY = Math.round(height * .47 + ((y - startY) % Math.max(1, Math.floor(height * .17))));
    const donor = (donorY * width + donorX) * 4;
    for (let channel = 0; channel < 3; channel++) data[i * 4 + channel] = original[i * 4 + channel] * (1 - amount) + original[donor + channel] * amount;
  }
  context.putImageData(pixels, 0, 0);
  return result;
}

/**
 * Creates original procedural material textures, guided by colours in this part's main-photo crop.
 * Colour input is sRGB 0..1. All generated canvases are <=384px; callers own their GPU textures.
 * Unseen panels deliberately contain no fabricated labels, ingredients, or barcodes.
 */
export function createInferredSurface(photo: HTMLImageElement, region: PhotoRegion, kind: string, color: SurfaceColor, metalContainer = false): InferredSurface {
  const knownKind: InferredSurfaceKind = ['box', 'soap', 'bottle', 'jar'].includes(kind) ? kind as InferredSurfaceKind : 'general';
  const sample = sourcePixels(photo, region);
  const fallback = color.map(value => clamp(value * 255)) as RGB;
  const seed = Math.round((region.x * 1747 + region.y * 2539 + region.width * 4051 + region.height * 7919) * 10)
    ^ Math.round(fallback[0] * 65536 + fallback[1] * 256 + fallback[2]);
  if(metalContainer){
    // An open tin seen almost face-on establishes its metal rim, but not a
    // printed rear panel. Continue that sampled metal on the wall and base.
    return {back:texture(fallback,seed,1.35,'jar').result,side:texture(fallback,seed+47,1.35,'jar').result,roughness:.33,metalness:.55};
  }
  if (knownKind === 'box') {
    const base = dominant(pixelsIn(sample, .06, .08, .94, .9), fallback, 'paper');
    const back = texture(base, seed, 3.2, knownKind), side = texture(base, seed + 47, 3.2, knownKind);
    // Continue only a broad, consistent band evidenced at the foot of this photographed box.
    // The side texture is also used on top/bottom geometry, so it remains plain paper.
    paperStructure(back.context, base, false, cartonAccent(sample, base));
    paperStructure(side.context, base, true);
    paperSeams(back.context, base, false); paperSeams(side.context, base, true);
    return { back: back.result, side: side.result, roughness: .86, metalness: 0, bump: texture(base, seed + 13, 7, knownKind, true).result };
  }
  if (knownKind === 'soap') {
    const { base, grain } = soapMaterial(sample, fallback);
    return {
      back: texture(base, seed, grain, knownKind).result,
      side: texture(base, seed + 47, grain, knownKind).result,
      roughness: .78, metalness: 0,
      bump: texture(base, seed + 13, grain * 1.6, knownKind, true).result,
    };
  }
  if (knownKind === 'bottle' || knownKind === 'jar') {
    const aspect = region.width * photo.naturalWidth / Math.max(1, region.height * photo.naturalHeight);
    if (knownKind === 'jar' && aspect > 1.3) {
      // A shallow silver tin is photographed from above: its printed lid does not describe
      // the material on the cylindrical reverse. Infer that from the exposed lower wall.
      const body = pixelsIn(sample, .17, .58, .83, .88);
      const neutral = body.filter(c => saturation(c) < 22 && luminance(c) > 90 && luminance(c) < 248);
      if (neutral.length > body.length * .72 && body.length) {
        const silver = dominant(neutral, fallback, 'neutral');
        if (luminance(silver) > 135) return {
          back: texture(silver, seed, 1.35, knownKind).result,
          side: texture(silver, seed + 47, 1.35, knownKind).result,
          roughness: .33, metalness: .55,
        };
      }
    }
    const profile = containerProfile(sample, fallback);
    const back = texture(profile, seed, 1.2, knownKind), side = texture(profile, seed + 47, 1.2, knownKind);
    capRidges(back.context, profile); capRidges(side.context, profile);
    return { back: back.result, side: side.result, roughness: .34, metalness: .035 };
  }
  const base = dominant(pixelsIn(sample, .12, .12, .88, .88), fallback, 'body');
  return { back: texture(base, seed, 2.5, knownKind).result, side: texture(base, seed + 47, 2.5, knownKind).result, roughness: .72, metalness: 0 };
}

/**
 * Materials for a true cylinder, separating the photographed lid from its wall. The front half
 * is cylindrically unwrapped; the unprinted material on the reverse retains real photographed
 * grain, glass facets and lid grips instead of collapsing each image row into a colour stripe.
 * Cylinder u=.5 is the front. Canvas top is the physical top (Three's default flipY applies).
 */
export function createVesselTextures(
  photo: HTMLImageElement, region: PhotoRegion, kind: string, color: SurfaceColor, profile: VesselPhotoProfile,
): VesselTextures {
  const cropped = createObjectFront(photo, region, 'general', color);
  const context = cropped.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The vessel material canvas is unavailable.');
  const source = context.getImageData(0, 0, cropped.width, cropped.height);
  const cornerSamples = [
    ...pixelsIn(source, 0, 0, .06, .06), ...pixelsIn(source, .94, 0, 1, .06),
    ...pixelsIn(source, 0, .94, .06, 1), ...pixelsIn(source, .94, .94, 1, 1),
  ];
  const background = dominant(cornerSamples, [250, 250, 250], 'neutral');
  const rowBounds: [number, number][] = [];
  for (let y = 0; y < source.height; y++) {
    let left = source.width, right = -1;
    for (let x = 0; x < source.width; x++) {
      const i = (y * source.width + x) * 4;
      const delta = Math.sqrt((source.data[i] - background[0]) ** 2 + (source.data[i + 1] - background[1]) ** 2 + (source.data[i + 2] - background[2]) ** 2);
      if (source.data[i + 3] > 220 && delta > 26) { left = Math.min(left, x); right = x; }
    }
    const inset = Math.max(2, (right - left) * .022);
    rowBounds.push(right - left > 12 ? [left + inset, right - inset] : [source.width * .4, source.width * .6]);
  }
  const sourceAt = (x: number, y: number): RGB => {
    const yy = clamp(y, 0, 1) * (source.height - 1);
    const [left, right] = rowBounds[Math.round(yy)];
    const xx = clamp(clamp(x, 0, 1) * (source.width - 1), left, right);
    const x0 = Math.floor(xx), y0 = Math.floor(yy), x1 = Math.min(x0 + 1, source.width - 1), y1 = Math.min(y0 + 1, source.height - 1);
    const a = (y0 * source.width + x0) * 4, b = (y0 * source.width + x1) * 4;
    const c = (y1 * source.width + x0) * 4, d = (y1 * source.width + x1) * 4;
    const fx = xx - x0, fy = yy - y0, result: RGB = [0, 0, 0];
    for (let channel = 0; channel < 3; channel++) {
      result[channel] = (source.data[a + channel] * (1 - fx) + source.data[b + channel] * fx) * (1 - fy)
        + (source.data[c + channel] * (1 - fx) + source.data[d + channel] * fx) * fy;
    }
    return result;
  };
  const shift = profile.depthShift ?? 0;
  const bodyRadius = profile.bodyRadiusRatio ?? .94;
  const frontSample = (theta: number, t: number, top: number, bottom: number, radius: number) => {
    const x = .5 + .5 * Math.sin(theta) * radius;
    const y = top + t * (bottom - top) + shift * Math.cos(theta) * radius;
    return sourceAt(x, y);
  };
  const bodySamples: RGB[] = [], lidSamples: RGB[] = [];
  let darkInk = 0, bodyCount = 0;
  for (let y = 0; y < 36; y++) for (let x = 0; x < 48; x++) {
    const theta = ((x + .5) / 48 - .5) * Math.PI * .74;
    const body = frontSample(theta, .12 + y / 35 * .72, profile.bodyTop, profile.bodyBottom, bodyRadius);
    bodySamples.push(body);
    // Text has dense near-black marks; pale powder and moulded glass lattice do not.
    if (Math.max(...body) < 95 && saturation(body) < 45) darkInk++;
    bodyCount++;
    lidSamples.push(frontSample(theta, .2 + y / 35 * .65, profile.lidTop, profile.lidBottom, 1));
  }
  const fallback = color.map(c => c * 255) as RGB;
  const bodyBase = dominant(bodySamples, fallback, 'neutral');
  const lidBase = dominant(lidSamples, [180, 180, 180], 'neutral');
  const bodyIsDark = luminance(bodyBase) < 85;
  const hasBodyPrinting = !bodyIsDark && darkInk / Math.max(1, bodyCount) > .018;
  const bodyIsMetal = bodySamples.filter(c => saturation(c) < 18 && luminance(c) > 100).length > bodySamples.length * .88;
  const lidIsMetal = lidSamples.filter(c => saturation(c) < 24 && luminance(c) > 95).length > lidSamples.length * .72;

  // When a body label is present, choose an unprinted flank tile. A fixed patch preserves
  // two-dimensional physical texture without reproducing that label on the reverse.
  const tileCandidates = [
    { left: -.47 * Math.PI, right: -.32 * Math.PI },
    { left: .32 * Math.PI, right: .47 * Math.PI },
  ];
  const tileScore = (tile: { left: number; right: number }) => {
    let score = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const c = frontSample(tile.left + x / 15 * (tile.right - tile.left), .15 + y / 15 * .7, profile.bodyTop, profile.bodyBottom, bodyRadius);
      if (Math.max(...c) < 95) score += 8;
      score += Math.abs(luminance(c) - luminance(bodyBase)) / 255;
    }
    return score;
  };
  const materialTile = tileCandidates.sort((a, b) => tileScore(a) - tileScore(b))[0];
  const bodyWallSample = (theta: number, t: number): RGB => {
    const direct = frontSample(theta, t, profile.bodyTop, profile.bodyBottom, bodyRadius);
    // At a grazing angle the wider lid hides the real wall. Sampling the photograph there
    // would paint backdrop or the cap onto the cylinder; continue observed wall material.
    const transition = clamp((.5 - Math.cos(theta)) / .32, 0, 1);
    if (!transition) return direct;
    const weight = transition * transition * (3 - 2 * transition);
    const materialTheta = hasBodyPrinting
      ? materialTile.left + (.5 + Math.asin(Math.sin(theta * 2.4)) / Math.PI) * (materialTile.right - materialTile.left)
      : Math.asin(Math.sin(theta * 2.4)) * .42;
    const observed = frontSample(materialTheta, .12 + t * .82, profile.bodyTop, profile.bodyBottom, bodyRadius);
    return blend(direct, observed, weight);
  };
  const lidWallSample = (theta: number, t: number): RGB => {
    const direct = frontSample(theta, t, profile.lidTop, profile.lidBottom, 1);
    const transition = clamp((.5 - Math.cos(theta)) / .32, 0, 1);
    if (!transition) return direct;
    const weight = transition * transition * (3 - 2 * transition);
    // Keep travelling across photographed grips at the side; a sine-only projection stalls
    // at 90 degrees and smears one vertical pixel column into a broad horizontal band.
    const materialTheta = Math.asin(Math.sin(theta * 3.2)) * .34;
    const observed = frontSample(materialTheta, .08 + t * .84, profile.lidTop, profile.lidBottom, 1);
    return blend(direct, observed, weight);
  };
  const panorama = (surface: 'body' | 'lid') => {
    const height = surface === 'body' ? 512 : 256;
    const { result, context: outputContext } = canvas(1024, height);
    const output = outputContext.createImageData(result.width, result.height);
    const top = surface === 'body' ? profile.bodyTop : profile.lidTop;
    const bottom = surface === 'body' ? profile.bodyBottom : profile.lidBottom;
    const radius = surface === 'body' ? bodyRadius : 1;
    for (let y = 0; y < height; y++) for (let x = 0; x < result.width; x++) {
      const u = x / (result.width - 1), t = y / (height - 1), theta = (u - .5) * Math.PI * 2;
      const front = Math.cos(theta) >= 0;
      let c: RGB;
      if (front) c = surface === 'body' ? bodyWallSample(theta, t) : lidWallSample(theta, t);
      else if (surface === 'body' && hasBodyPrinting) {
        const rearFraction = ((u + .25) % 1) * 2;
        // A triangular repeat avoids a tile seam. Only a screened material flank is repeated.
        const phase = (rearFraction * 4) % 2;
        const across = phase <= 1 ? phase : 2 - phase;
        c = frontSample(materialTile.left + across * (materialTile.right - materialTile.left), .08 + t * .84, top, bottom, radius);
        if (!bodyIsDark && Math.max(...c) < 95) c = bodyBase;
      } else {
        // Unprinted material can continue around the cylinder. Reflect only its grain/grips,
        // never the separate lid label; preserving x/y detail also preserves glass moulding.
        const reflected = Math.asin(Math.sin(theta));
        c = surface === 'body' ? bodyWallSample(reflected, t) : lidWallSample(reflected, t);
      }
      const i = (y * result.width + x) * 4;
      output.data[i] = c[0]; output.data[i + 1] = c[1]; output.data[i + 2] = c[2]; output.data[i + 3] = 255;
    }
    outputContext.putImageData(output, 0, 0);
    return result;
  };
  const body = panorama('body'), lid = panorama('lid');
  const ellipse = profile.lidEllipse ?? { x: 0, y: 0, width: 1, height: Math.max(.1, profile.lidTop * 2) };
  const { result: top, context: topContext } = canvas(1024, 1024);
  topContext.drawImage(cropped, ellipse.x * cropped.width, ellipse.y * cropped.height,
    ellipse.width * cropped.width, ellipse.height * cropped.height, 0, 0, top.width, top.height);
  const bottomBase = bodyIsMetal ? bodyBase : dominant(bodySamples.filter(c => luminance(c) > 90), bodyBase, 'body');
  const bottom = texture(bottomBase, 38251 + Math.round(luminance(bodyBase)), 2.2, kind === 'jar' ? 'jar' : 'general').result;
  return {
    body, lid, top, bottom,
    bodyRoughness: bodyIsMetal ? .38 : .48, bodyMetalness: bodyIsMetal ? .5 : .015,
    lidRoughness: lidIsMetal ? .32 : .4, lidMetalness: lidIsMetal ? .6 : .025,
  };
}
