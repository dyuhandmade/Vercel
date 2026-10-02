import type { PhotoMask } from './photo-model';

type Point = { x: number; y: number };
type Bounds = { x: number; y: number; width: number; height: number };

const median = (values: number[]) => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;
  const first = points[0], last = points[points.length - 1];
  const dx = last.x - first.x, dy = last.y - first.y;
  const length = Math.hypot(dx, dy);
  let furthest = 0, distance = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = length ? Math.abs(dy * points[i].x - dx * points[i].y + last.x * first.y - last.y * first.x) / length : Math.hypot(points[i].x - first.x, points[i].y - first.y);
    if (d > distance) { distance = d; furthest = i; }
  }
  return distance > tolerance
    ? [...simplify(points.slice(0, furthest + 1), tolerance).slice(0, -1), ...simplify(points.slice(furthest), tolerance)]
    : [first, last];
}

/**
 * Recover a convex manufactured outline rather than extruding its enclosing
 * rectangle. When another object obscures one edge, the exposed edge and its
 * opposite half supply the contour. This is only accepted with substantial
 * outline evidence; a rectangular face stays a rectangle.
 */
export function inferConvexContour(analysis: PhotoMask, bounds: Bounds, exposedSide: 'left' | 'right' | 'both' = 'both'): Point[] | undefined {
  const { mask, width, height } = analysis;
  if (bounds.width < 12 || bounds.height < 12) return;
  const centre = bounds.x + (bounds.width - 1) / 2;
  const top = Math.max(0, Math.round(bounds.y)), bottom = Math.min(height - 1, Math.round(bounds.y + bounds.height - 1));
  const radius = bounds.width / 2;
  const radii: number[] = [];
  for (let y = top; y <= bottom; y++) {
    let left = centre, right = centre;
    for (let x = Math.max(0, Math.floor(bounds.x)); x < Math.min(width, bounds.x + bounds.width); x++) {
      if (!mask[y * width + x]) continue;
      left = Math.min(left, x); right = Math.max(right, x);
    }
    radii.push(exposedSide === 'left' ? centre - left : exposedSide === 'right' ? right - centre : Math.min(centre - left, right - centre));
  }
  const middle = median(radii.slice(Math.round(radii.length * .38), Math.round(radii.length * .62)));
  const upper = median(radii.slice(1, Math.max(3, Math.round(radii.length * .12))));
  const lower = median(radii.slice(Math.round(radii.length * .88), -1));
  if (middle < radius * .70 || middle - Math.min(upper, lower) < radius * .20) return;

  // Small rows at a blurred top edge and loose bottom props must not create
  // spikes. Use a short median and the cleaner of matching upper/lower rows.
  const smooth = radii.map((_, i) => median(radii.slice(Math.max(0, i - 2), Math.min(radii.length, i + 3))));
  const clean = smooth.map((r, i) => Math.min(r, smooth[smooth.length - 1 - i]));
  const edgeInset = Math.max(.5, Math.min(1.5, bounds.width * .018));
  const rightPoints: Point[] = clean.map((r, i) => ({ x: centre + Math.max(1, r - edgeInset), y: top + i }));
  const reduced = simplify(rightPoints, Math.max(.65, bounds.width * .015));
  if (reduced.length < 3 || reduced.length > 13) return;
  const leftPoints = reduced.slice().reverse().map(point => ({ x: 2 * centre - point.x, y: point.y }));
  const contour = [...reduced, ...leftPoints];
  // A valid, substantial face is needed; reject tiny props and slim slivers.
  let area = 0;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i], b = contour[(i + 1) % contour.length];
    area += a.x * b.y - b.x * a.y;
  }
  if (Math.abs(area) / 2 < bounds.width * bounds.height * .48) return;
  return contour;
}

/** Preserve the stepped neck and cap of a visibly flat, straight-sided vessel. */
export function inferSteppedContour(analysis: PhotoMask, bounds: Bounds): Point[] | undefined {
  const centre = bounds.x + (bounds.width - 1) / 2, radii: number[] = [];
  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    let left = centre, right = centre;
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) if (analysis.mask[y * analysis.width + x]) { left = Math.min(left, x); right = Math.max(right, x); }
    radii.push(Math.max(1, Math.min(centre - left, right - centre)));
  }
  const body = radii.slice(Math.round(radii.length * .34), Math.round(radii.length * .86));
  const bodyRadius = median(body), capRadius = median(radii.slice(2, Math.round(radii.length * .15)));
  const stable = body.filter(radius => Math.abs(radius - bodyRadius) < bounds.width * .045).length / Math.max(1, body.length);
  if (bodyRadius < bounds.width * .40 || capRadius > bodyRadius * .82 || capRadius < bodyRadius * .32 || stable < .88) return;
  let neckEnd = -1, bodyStart = -1;
  for (let i = Math.round(radii.length * .12); i < radii.length * .42; i++) {
    if (radii[i] < bodyRadius * .76) neckEnd = i;
    if (radii[i] > bodyRadius * .93 && neckEnd >= 0) { bodyStart = i; break; }
  }
  if (bodyStart < 0 || bodyStart - neckEnd > radii.length * .07) return;
  const smooth = radii.map((_, i) => median(radii.slice(Math.max(0, i - 1), Math.min(radii.length, i + 2))));
  const right = simplify(smooth.map((radius, i) => ({ x: centre + radius, y: bounds.y + i })), Math.max(.45, bounds.width * .013));
  if (right.length < 4 || right.length > 20) return;
  return [...right, ...right.slice().reverse().map(point => ({ x: 2 * centre - point.x, y: point.y }))];
}
