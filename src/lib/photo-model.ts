import type {PhotoObject} from './photo-objects';

/** Browser-side, bounded reconstruction of a photographed product's visible surface. */
export type PhotoModelMetadata = {
  kind: 'volume' | 'relief';
  width: number;
  height: number;
  depth: number;
  confidence: number;
  construction?: 'solids' | 'silhouette' | 'relief';
  parts?: number;
  partKinds?: string[];
};

export type PhotoPixels = { width: number; height: number; data: Uint8ClampedArray };
export type PhotoMask = {
  width: number;
  height: number;
  mask: Uint8Array;
  bounds: { x: number; y: number; width: number; height: number };
  kind: 'volume' | 'relief';
  confidence: number;
  color: [number, number, number];
};

const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const distance = (a: number[], b: number[]) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

/** Pale packaging can meet a pale background through a faint edge. Preserve its solid face. */
function solidSilhouette(mask: Uint8Array, width: number, height: number) {
  const ranges = (length: number, occupied: (index: number) => boolean) => {
    const result: [number, number][] = [];
    let start = 0, gap = -1;
    for (let i = 0; i <= length; i++) {
      if (i < length && !occupied(i)) { if (gap < 0) gap = i; continue; }
      if (gap >= 0 && i - gap >= 3) {
        if (gap > start) result.push([start, gap]);
        start = i;
      }
      gap = -1;
    }
    if (start < length) result.push([start, length]);
    return result;
  };
  // A clear strip between separate bottles/boxes stays a real gap in the mesh.
  const xs = ranges(width, x => { for (let y = 0; y < height; y++) if (mask[y * width + x]) return true; return false; });
  const ys = ranges(height, y => { for (let x = 0; x < width; x++) if (mask[y * width + x]) return true; return false; });
  for (const [x0, x1] of xs) for (const [y0, y1] of ys) {
    for (let pass = 0; pass < 2; pass++) {
      for (let y = y0; y < y1; y++) {
        let first = x1, last = -1;
        for (let x = x0; x < x1; x++) if (mask[y * width + x]) { first = Math.min(first, x); last = x; }
        for (let x = first; x <= last; x++) mask[y * width + x] = 1;
      }
      for (let x = x0; x < x1; x++) {
        let first = y1, last = -1;
        for (let y = y0; y < y1; y++) if (mask[y * width + x]) { first = Math.min(first, y); last = y; }
        for (let y = first; y <= last; y++) mask[y * width + x] = 1;
      }
    }
  }
}

/** A thin, widely spaced caption above a large object is artwork, not separate geometry. */
function hasMarketingCaption(mask: Uint8Array, width: number, height: number) {
  type Band = { top: number; bottom: number; left: number; right: number; count: number };
  const bands: Band[] = [];
  for (let y = 0; y < height; y++) {
    let left = width, right = -1, count = 0;
    for (let x = 0; x < width; x++) if (mask[y * width + x]) { left = Math.min(left, x); right = x; count++; }
    if (count < 2) continue;
    const previous = bands[bands.length - 1];
    if (previous && y - previous.bottom <= 3) {
      previous.bottom = y; previous.left = Math.min(previous.left, left); previous.right = Math.max(previous.right, right); previous.count += count;
    } else bands.push({ top: y, bottom: y, left, right, count });
  }
  const main = bands.reduce<Band | undefined>((largest, band) => !largest || band.count > largest.count ? band : largest, undefined);
  if (!main || main.bottom - main.top < height * .18) return false;
  return bands.some(band => {
    const bandWidth = band.right - band.left + 1, bandHeight = band.bottom - band.top + 1;
    return band.bottom < main.top - Math.max(3, height * .018)
      && bandWidth > width * .35 && bandHeight <= Math.max(5, height * .12)
      && band.count >= 20 && band.count < main.count * .32
      && band.count / (bandWidth * bandHeight) < .75;
  });
}

/** Only removes a uniform background connected to the border, preserving interior labels. */
export function analysePhotoPixels({ width, height, data }: PhotoPixels): PhotoMask {
  const count = width * height;
  const mask = new Uint8Array(count).fill(1);
  const border: number[] = [];
  for (let x = 0; x < width; x++) border.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y++) border.push(y * width, y * width + width - 1);
  const rgb = (i: number) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  let transparent = 0;
  for (let i = 0; i < count; i++) if (data[i * 4 + 3] < 32) transparent++;
  let confidence = 0;
  let segmented = false;

  if (transparent > count * .015 && transparent < count * .995) {
    for (let i = 0; i < count; i++) mask[i] = data[i * 4 + 3] >= 48 ? 1 : 0;
    segmented = true;
    confidence = .98;
  } else {
    const buckets = new Map<string, { sum: number[]; count: number }>();
    for (const i of border) {
      const c = rgb(i);
      const key = c.map(v => Math.round(v / 32)).join(',');
      const bucket = buckets.get(key) || { sum: [0, 0, 0], count: 0 };
      bucket.count++;
      c.forEach((v, j) => bucket.sum[j] += v);
      buckets.set(key, bucket);
    }
    const dominant = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
    const background = dominant.sum.map(v => v / dominant.count);
    const nearby = border.filter(i => distance(rgb(i), background) < 44);
    const support = nearby.length / border.length;
    const variance = nearby.reduce((sum, i) => sum + distance(rgb(i), background) ** 2, 0) / Math.max(1, nearby.length);
    if (support > .7 && Math.sqrt(variance) < 28) {
      const threshold = clamp(24 + Math.sqrt(variance) * 1.7, 28, 58);
      const queue = new Int32Array(count);
      let head = 0, tail = 0;
      const visit = (i: number) => {
        if (mask[i] && (data[i * 4 + 3] < 48 || distance(rgb(i), background) < threshold)) {
          mask[i] = 0;
          queue[tail++] = i;
        }
      };
      for (const i of border) visit(i);
      while (head < tail) {
        const i = queue[head++], x = i % width;
        if (x > 0) visit(i - 1);
        if (x < width - 1) visit(i + 1);
        if (i >= width) visit(i - width);
        if (i < count - width) visit(i + width);
      }
      segmented = true;
      confidence = support;
    }
  }

  // Promotional captions belong to the full photograph; do not extrude individual letters.
  if (segmented && transparent <= count * .015 && hasMarketingCaption(mask, width, height)) {
    mask.fill(1); segmented = false; confidence = 0;
  }
  // Remove tiny disconnected compression/shadow flecks without discarding a gift set's pieces.
  if (segmented) {
    const visited = new Uint8Array(count);
    const queue = new Int32Array(count);
    for (let start = 0; start < count; start++) {
      if (!mask[start] || visited[start]) continue;
      let head = 0, tail = 1;
      queue[0] = start;
      visited[start] = 1;
      while (head < tail) {
        const i = queue[head++], x = i % width;
        const add = (n: number) => { if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; } };
        if (x > 0) add(i - 1);
        if (x < width - 1) add(i + 1);
        if (i >= width) add(i - width);
        if (i < count - width) add(i + width);
      }
      if (tail < Math.max(5, count * .0003)) for (let j = 0; j < tail; j++) mask[queue[j]] = 0;
    }
    if (transparent <= count * .015) solidSilhouette(mask, width, height);
  }

  let minX = width, minY = height, maxX = -1, maxY = -1, foreground = 0;
  for (let i = 0; i < count; i++) if (mask[i]) {
    foreground++;
    const x = i % width, y = Math.floor(i / width);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const spansFrame = maxX - minX + 1 >= width * .98 && maxY - minY + 1 >= height * .98;
  if (!segmented || foreground < count * .012 || foreground > count * .9 || (spansFrame && foreground > count * .7) || maxX < minX) {
    mask.fill(1);
    minX = 0; minY = 0; maxX = width - 1; maxY = height - 1;
    segmented = false; confidence = 0;
  }
  const sums = [0, 0, 0]; let samples = 0;
  for (let i = 0; i < count; i += 3) if (mask[i]) {
    const c = rgb(i), high = Math.max(...c), low = Math.min(...c);
    if (high > 35 && high < 235 && (high - low > 18 || samples < 10)) {
      c.forEach((v, j) => sums[j] += v); samples++;
    }
  }
  const color = (samples ? sums.map(v => clamp(v / samples / 255, .08, .86)) : [.48, .43, .34]) as [number, number, number];
  return { width, height, mask, bounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }, kind: segmented ? 'volume' : 'relief', confidence, color };
}

/** A watertight front/back heightfield with side walls; no photograph is applied to the reverse. */
export function buildPhotoGeometry(analysis: PhotoMask, shape = 'general') {
  const { bounds, mask, width: sourceWidth, height: sourceHeight } = analysis;
  const aspect = bounds.width / bounds.height;
  const width = aspect >= 1 ? 2 : 2 * aspect;
  const height = aspect >= 1 ? 2 / aspect : 2;
  const cols = Math.max(12, Math.round(124 * width / Math.max(width, height)));
  const rows = Math.max(12, Math.round(124 * height / Math.max(width, height)));
  const occupied = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const sx = clamp(Math.floor(bounds.x + (x + .5) / cols * bounds.width), 0, sourceWidth - 1);
    const sy = clamp(Math.floor(bounds.y + (y + .5) / rows * bounds.height), 0, sourceHeight - 1);
    occupied[y * cols + x] = mask[sy * sourceWidth + sx];
  }
  const stride = cols + 1, vertexCount = stride * (rows + 1);
  const distances = new Float32Array(vertexCount);
  const inside = (x: number, y: number) => x >= 0 && x < cols && y >= 0 && y < rows && occupied[y * cols + x] !== 0;
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
    distances[y * stride + x] = inside(x - 1, y - 1) && inside(x, y - 1) && inside(x - 1, y) && inside(x, y) ? 999 : 0;
  }
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
    const i = y * stride + x;
    if (x) distances[i] = Math.min(distances[i], distances[i - 1] + 1);
    if (y) distances[i] = Math.min(distances[i], distances[i - stride] + 1);
    if (x && y) distances[i] = Math.min(distances[i], distances[i - stride - 1] + Math.SQRT2);
  }
  for (let y = rows; y >= 0; y--) for (let x = cols; x >= 0; x--) {
    const i = y * stride + x;
    if (x < cols) distances[i] = Math.min(distances[i], distances[i + 1] + 1);
    if (y < rows) distances[i] = Math.min(distances[i], distances[i + stride] + 1);
    if (x < cols && y < rows) distances[i] = Math.min(distances[i], distances[i + stride + 1] + Math.SQRT2);
  }
  const relief = analysis.kind === 'relief';
  const shortSide = Math.min(width, height);
  const halfDepth = relief ? .065 : shape === 'bottle' ? Math.min(.58, shortSide * .43) : shape === 'jar' ? Math.min(.5, shortSide * .34) : shape === 'soap' ? Math.min(.3, shortSide * .22) : Math.min(.32, shortSide * .25);
  const bevel = Math.min(cols, rows) * (shape === 'soap' ? .13 : .37);
  const positions = new Float32Array(vertexCount * 2 * 3);
  const uvs = new Float32Array(vertexCount * 2 * 2);
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
    const i = y * stride + x;
    const roundness = Math.sin(Math.min(1, distances[i] / Math.max(1, bevel)) * Math.PI / 2);
    const front = .025 + halfDepth * .89 * roundness;
    const back = -front;
    for (let side = 0; side < 2; side++) {
      const v = i + side * vertexCount;
      positions.set([(x / cols - .5) * width, (.5 - y / rows) * height, side ? back : front], v * 3);
      uvs.set([x / cols, 1 - y / rows], v * 2);
    }
  }
  const frontIndices: number[] = [], bodyIndices: number[] = [];
  const boundary = new Map<number, Set<number>>();
  const wall = (a: number, b: number) => {
    bodyIndices.push(a, a + vertexCount, b, b, a + vertexCount, b + vertexCount);
    if (!boundary.has(a)) boundary.set(a, new Set());
    if (!boundary.has(b)) boundary.set(b, new Set());
    boundary.get(a)!.add(b); boundary.get(b)!.add(a);
  };
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (inside(x, y)) {
    const a = y * stride + x, b = a + 1, c = a + stride, d = c + 1;
    frontIndices.push(a, c, b, b, c, d);
    bodyIndices.push(a + vertexCount, b + vertexCount, c + vertexCount, b + vertexCount, d + vertexCount, c + vertexCount);
    if (!inside(x - 1, y)) wall(a, c);
    if (!inside(x + 1, y)) wall(d, b);
    if (!inside(x, y - 1)) wall(b, a);
    if (!inside(x, y + 1)) wall(c, d);
  }
  // Smooth pixel stair steps along the silhouette, keeping front/back vertices shared.
  const corners = new Set<number>();
  const straightArm = (origin: number, next: number) => {
    const dx = positions[next * 3] - positions[origin * 3], dy = positions[next * 3 + 1] - positions[origin * 3 + 1];
    let previous = origin, current = next;
    for (let step = 0; step < 2; step++) {
      const neighbours = [...(boundary.get(current) || [])];
      if (neighbours.length !== 2) return false;
      const following = neighbours.find(v => v !== previous)!;
      if (Math.abs(positions[following * 3] - positions[current * 3] - dx) > .00001 || Math.abs(positions[following * 3 + 1] - positions[current * 3 + 1] - dy) > .00001) return false;
      previous = current; current = following;
    }
    return true;
  };
  for (const [vertex, adjacent] of boundary) {
    const neighbours = [...adjacent];
    if (neighbours.length !== 2) { corners.add(vertex); continue; }
    const [a, b] = neighbours;
    const ax = positions[a * 3] - positions[vertex * 3], ay = positions[a * 3 + 1] - positions[vertex * 3 + 1];
    const bx = positions[b * 3] - positions[vertex * 3], by = positions[b * 3 + 1] - positions[vertex * 3 + 1];
    if (Math.abs(ax * bx + ay * by) < .000001 && straightArm(vertex, a) && straightArm(vertex, b)) corners.add(vertex);
  }
  for (let pass = 0; pass < 3; pass++) {
    const updates: [number, number, number][] = [];
    for (const [vertex, adjacent] of boundary) {
      if (corners.has(vertex)) continue;
      const [a, b] = [...adjacent];
      const x = positions[vertex * 3], y = positions[vertex * 3 + 1];
      updates.push([vertex, x + ((positions[a * 3] + positions[b * 3]) / 2 - x) * .28, y + ((positions[a * 3 + 1] + positions[b * 3 + 1]) / 2 - y) * .28]);
    }
    for (const [vertex, x, y] of updates) for (const v of [vertex, vertex + vertexCount]) {
      positions[v * 3] = x; positions[v * 3 + 1] = y;
      uvs[v * 2] = clamp(x / width + .5, 0, 1); uvs[v * 2 + 1] = clamp(y / height + .5, 0, 1);
    }
  }
  return {
    positions, uvs, indices: new Uint32Array([...frontIndices, ...bodyIndices]), frontCount: frontIndices.length,
    metadata: { kind: analysis.kind, width, height, depth: .05 + halfDepth * 1.78, confidence: analysis.confidence } satisfies PhotoModelMetadata,
  };
}

/** Ask Shopify's own CDN for a bounded image; leave every other provider's URL intact. */
export function photoModelSourceUrl(source: string): string {
  try {
    const url = new URL(source);
    const shopifyCdn = url.hostname === 'cdn.shopify.com' || url.hostname === 'cdn.shopifycdn.net';
    const storefrontCdn = url.hostname.endsWith('.myshopify.com') && url.pathname.startsWith('/cdn/shop/');
    if (url.protocol !== 'https:' || (!shopifyCdn && !storefrontCdn)) return source;
    const requestedWidth = Number(url.searchParams.get('width'));
    const requestedHeight = Number(url.searchParams.get('height'));
    if (requestedWidth > 0 && requestedHeight > 0) {
      const ratio = Math.min(1, 1024 / Math.max(requestedWidth, requestedHeight));
      url.searchParams.set('width', String(Math.max(1, Math.floor(requestedWidth * ratio))));
      url.searchParams.set('height', String(Math.max(1, Math.floor(requestedHeight * ratio))));
    } else if (requestedHeight > 0) {
      url.searchParams.set('height', String(Math.min(1024, requestedHeight)));
    } else {
      // A single dimension preserves the photograph's original aspect ratio.
      url.searchParams.set('width', String(requestedWidth > 0 ? Math.min(1024, requestedWidth) : 1024));
    }
    return url.href;
  } catch { return source; }
}

function loadImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => finish(new DOMException('Aborted', 'AbortError'));
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      image.onload = null; image.onerror = null;
      if (error) { image.removeAttribute('src'); reject(error); } else resolve(image);
    };
    image.onload = () => image.naturalWidth ? finish() : finish(new Error('Product photograph is empty.'));
    image.onerror = () => finish(new Error('Product photograph could not be loaded.'));
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => finish(new Error('Product photograph timed out.')), 18000);
    image.src = url;
  });
}

export async function preparePhotoModel(url: string, shape?: string, signal?: AbortSignal) {
  const photo = await loadImage(photoModelSourceUrl(url), signal);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const scale = Math.min(1, 192 / Math.max(photo.naturalWidth, photo.naturalHeight));
  const sample = document.createElement('canvas');
  sample.width = Math.max(2, Math.round(photo.naturalWidth * scale));
  sample.height = Math.max(2, Math.round(photo.naturalHeight * scale));
  const context = sample.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Photo processing is unavailable.');
  context.drawImage(photo, 0, 0, sample.width, sample.height);
  // A blocked CORS read must reject; the gallery keeps the ordinary Shopify photograph.
  const pixels = context.getImageData(0, 0, sample.width, sample.height);
  const analysis = analysePhotoPixels(pixels);
  const {inferPhotoObjects}=await import('./photo-objects');
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const objects:PhotoObject[]=inferPhotoObjects(pixels,analysis,shape);
  if(!objects.length&&shape==='jar'){
    const {inferHeldContainer}=await import('./photo-held-container');
    if(signal?.aborted)throw new DOMException('Aborted','AbortError');
    const container=inferHeldContainer(pixels);
    if(container)objects.push(container);
  }
  const { bounds } = analysis;
  const texture = document.createElement('canvas');
  const longest = Math.max(bounds.width, bounds.height);
  texture.width = Math.max(2, Math.round(1024 * bounds.width / longest));
  texture.height = Math.max(2, Math.round(1024 * bounds.height / longest));
  const textureContext = texture.getContext('2d');
  if (!textureContext) throw new Error('Photo texture is unavailable.');
  textureContext.drawImage(photo, bounds.x / sample.width * photo.naturalWidth, bounds.y / sample.height * photo.naturalHeight, bounds.width / sample.width * photo.naturalWidth, bounds.height / sample.height * photo.naturalHeight, 0, 0, texture.width, texture.height);
  return { ...buildPhotoGeometry(analysis, shape), texture, color: analysis.color, photo, analysis, objects };
}
