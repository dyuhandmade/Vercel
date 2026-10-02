import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// TypeScript 7 has no transpileModule API; its installed CLI also works on Node 20.
const require = createRequire(import.meta.url);
const temporaryRoot = resolve(tmpdir());
const temporary = mkdtempSync(join(temporaryRoot, 'dyu-photo-model-'));
let utility, objectUtility;
try {
  const compiler = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
  execFileSync(process.execPath, [compiler, '--ignoreConfig', fileURLToPath(new URL('../src/lib/photo-model.ts', import.meta.url)), '--target', 'ES2020', '--module', 'ESNext', '--lib', 'ES2020,DOM', '--skipLibCheck', '--outDir', temporary], { stdio: ['ignore', 'pipe', 'pipe'] });
  const javascript = readFileSync(join(temporary, 'photo-model.js'), 'utf8');
  utility = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
  const contourJavascript = readFileSync(join(temporary, 'photo-contours.js'), 'utf8');
  const contourUrl = `data:text/javascript;base64,${Buffer.from(contourJavascript).toString('base64')}`;
  const objectJavascript = readFileSync(join(temporary, 'photo-objects.js'), 'utf8').replace("'./photo-contours'", JSON.stringify(contourUrl));
  objectUtility = await import(`data:text/javascript;base64,${Buffer.from(objectJavascript).toString('base64')}`);
} finally {
  // Delete only this runner's newly created directory directly inside the OS temp directory.
  assert.equal(dirname(resolve(temporary)), temporaryRoot);
  assert.ok(basename(temporary).startsWith('dyu-photo-model-'));
  rmSync(temporary, { recursive: true, force: true });
}
const { analysePhotoPixels, buildPhotoGeometry, photoModelSourceUrl } = utility;
const { inferPhotoObjects } = objectUtility;

const pixels = (width, height, paint) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(paint(x, y), (y * width + x) * 4);
  return { width, height, data };
};
const white = [249, 249, 249, 255], brown = [110, 66, 28, 255];
const cases = [
  {
    name: 'clean bottle retains pale enclosed label', shape: 'bottle', expected: 'volume',
    photo: pixels(100, 140, (x, y) => x > 30 && x < 70 && y > 15 && y < 125 ? (x > 38 && x < 62 && y > 55 && y < 95 ? white : brown) : white),
    verify: result => assert.equal(result.mask[75 * 100 + 50], 1, 'pale label must remain solid'),
  },
  {
    name: 'pale packaging with a broken border stays solid', shape: 'soap', expected: 'volume',
    photo: pixels(100, 120, (x, y) => {
      const left = x >= 15 && x <= 18 && y >= 20 && y <= 99;
      const right = x >= 79 && x <= 82 && y >= 20 && y <= 99;
      const base = x >= 15 && x <= 82 && y >= 94 && y <= 99;
      const label = x >= 40 && x <= 58 && y >= 45 && y <= 55;
      return left || right || base || label ? brown : white;
    }),
    verify: result => assert.equal(result.mask[70 * 100 + 50], 1, 'white box face must not become a hollow cutout'),
  },
  {
    name: 'separate gift-set pieces retain the gap', shape: 'general', expected: 'volume',
    photo: pixels(140, 110, (x, y) => y > 15 && y < 95 && ((x > 10 && x < 53) || (x > 84 && x < 128)) ? brown : white),
    verify: result => {
      assert.equal(result.mask[50 * 140 + 30], 1);
      assert.equal(result.mask[50 * 140 + 105], 1);
      assert.equal(result.mask[50 * 140 + 70], 0, 'a blank strip between products must stay empty');
    },
  },
  {
    name: 'transparent silhouette and interior hole are preserved', shape: 'jar', expected: 'volume',
    photo: pixels(100, 100, (x, y) => { const d = (x - 50) ** 2 + (y - 50) ** 2; return d < 32 ** 2 && d > 8 ** 2 ? [155, 145, 91, 255] : [0, 0, 0, 0]; }),
    verify: result => { assert.equal(result.mask[50 * 100 + 50], 0); assert.equal(result.mask[50 * 100 + 70], 1); },
  },
  {
    name: 'complex photo is retained as relief', shape: 'general', expected: 'relief',
    photo: pixels(100, 100, (x, y) => [(x * 17 + y * 11) % 255, (x * 31 + y * 3) % 255, (x * 7 + y * 29) % 255, 255]),
    verify: result => assert.ok(result.mask.every(Boolean), 'an uncertain photo must not be arbitrarily segmented'),
  },
  {
    name: 'marketing caption stays in the complete photo relief', shape: 'general', expected: 'relief',
    photo: pixels(160, 160, (x, y) => {
      const caption = y >= 18 && y <= 25 && x >= 30 && x <= 139 && x % 6 < 3;
      const products = y >= 68 && y <= 145 && x >= 10 && x <= 148;
      return caption || products ? brown : white;
    }),
    verify: result => assert.ok(result.mask.every(Boolean), 'caption letters must not become floating product parts'),
  },
  {
    name: 'unsegmented full frame is never called a volume', shape: 'general', expected: 'relief',
    photo: pixels(100, 100, () => white), verify: () => {},
  },
];

function verifyMesh(mesh, name) {
  const { positions, uvs, indices, frontCount, metadata } = mesh;
  assert.ok(indices.length && indices.length % 3 === 0, `${name}: triangles exist`);
  assert.ok(frontCount > 0 && frontCount < indices.length, `${name}: distinct photo/front and neutral/body groups`);
  assert.ok(positions.every(Number.isFinite), `${name}: finite positions`);
  assert.ok(uvs.every(value => Number.isFinite(value) && value >= 0 && value <= 1), `${name}: bounded UVs`);
  assert.equal(Math.max(metadata.width, metadata.height), 2, `${name}: normalized dimensions`);
  const vertexCount = positions.length / 3, frontVertices = vertexCount / 2;
  const edges = new Map();
  let volume = 0, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < indices.length; i += 3) {
    const tri = [indices[i], indices[i + 1], indices[i + 2]];
    for (let j = 0; j < 3; j++) {
      const a = tri[j], b = tri[(j + 1) % 3];
      assert.ok(a >= 0 && a < vertexCount, `${name}: valid index`);
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const edge = edges.get(key) || { count: 0, direction: 0 };
      edge.count++; edge.direction += a < b ? 1 : -1; edges.set(key, edge);
      minZ = Math.min(minZ, positions[a * 3 + 2]); maxZ = Math.max(maxZ, positions[a * 3 + 2]);
      if (i < frontCount) assert.ok(a < frontVertices, `${name}: photo material appears only on the front`);
    }
    const [a, b, c] = tri.map(index => positions.subarray(index * 3, index * 3 + 3));
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  for (const edge of edges.values()) {
    assert.equal(edge.count, 2, `${name}: every edge is closed`);
    assert.equal(edge.direction, 0, `${name}: consistent face winding`);
  }
  assert.ok(volume > 0, `${name}: genuine closed positive volume`);
  assert.ok(maxZ > .025 && minZ < -.025, `${name}: rounded depth on both sides`);
  assert.ok(Math.abs(maxZ + minZ) < .00001, `${name}: centered depth`);
  for (let i = 0; i < frontVertices; i++) {
    assert.ok(Math.abs(uvs[i * 2] - (positions[i * 3] / metadata.width + .5)) < .00001, `${name}: front photo u alignment`);
    assert.ok(Math.abs(uvs[i * 2 + 1] - (positions[i * 3 + 1] / metadata.height + .5)) < .00001, `${name}: front photo v alignment`);
  }
}

for (const item of cases) {
  const analysed = analysePhotoPixels(item.photo);
  assert.equal(analysed.kind, item.expected, item.name);
  item.verify(analysed);
  verifyMesh(buildPhotoGeometry(analysed, item.shape), item.name);
  console.log(`PASS ${item.name}`);
}
const resized = new URL(photoModelSourceUrl('https://cdn.shopify.com/s/files/product.png?v=123'));
assert.equal(resized.searchParams.get('width'), '1024');
assert.equal(resized.searchParams.get('v'), '123');
assert.equal(resized.searchParams.has('height'), false, 'do not crop a portrait photograph to a square');
assert.equal(new URL(photoModelSourceUrl('https://cdn.shopify.com/s/files/product.png?width=500')).searchParams.get('width'), '500');
assert.equal(photoModelSourceUrl('https://example.com/photo.png?width=3000'), 'https://example.com/photo.png?width=3000');
assert.equal(photoModelSourceUrl('/images/product.png'), '/images/product.png');
assert.equal(photoModelSourceUrl('https://cdn.shopify.com.evil.example/photo.png'), 'https://cdn.shopify.com.evil.example/photo.png');
console.log('PASS Shopify image-size bounds preserve other providers and image proportions');

const rose = [190, 70, 64, 255], paper = [225, 220, 218, 255];
const objectCases = [
  {
    name: 'single soap remains one soap solid',
    photo: pixels(160, 180, (x, y) => x > 35 && x < 125 && y > 25 && y < 155 ? rose : white),
    verify: objects => { assert.equal(objects.length, 1); assert.equal(objects[0].kind, 'soap'); },
  },
  {
    name: 'printed label does not split a carton into multiple objects',
    photo: pixels(160, 180, (x, y) => x > 35 && x < 125 && y > 25 && y < 155 ? (x > 65 && x < 100 && y > 70 && y < 115 ? rose : paper) : white),
    verify: objects => { assert.equal(objects.length, 1); assert.equal(objects[0].kind, 'box'); },
  },
  {
    name: 'pale bare soap is not mistaken for printed packaging',
    photo: pixels(160, 180, (x, y) => x > 35 && x < 125 && y > 25 && y < 155 ? [205, 194, 173, 255] : white),
    verify: objects => { assert.equal(objects.length, 1); assert.equal(objects[0].kind, 'soap'); },
  },
  {
    name: 'carton and soap separate while decorative petals stay outside the solids',
    photo: pixels(220, 180, (x, y) => {
      if (x >= 168 && x < 213 && y >= 150 && y < 172) return [230, 20, 90, 255];
      if (x >= 20 && x < 110 && y >= 25 && y < 155) return paper;
      if (x >= 110 && x < 198 && y >= 40 && y < 155) return rose;
      return white;
    }),
    verify: objects => {
      assert.equal(objects.length, 2);
      assert.equal(objects[0].kind, 'box'); assert.equal(objects[1].kind, 'soap');
      assert.ok(objects.every(object => object.bounds.y + object.bounds.height <= 157), 'petals must not extend the product geometry');
      assert.ok(Math.abs(objects[0].bounds.x + objects[0].bounds.width - 110) <= 4, 'boundary must follow the carton/bar seam');
      assert.ok(objects[0].color[1] > objects[1].color[1] + .3, 'carton and soap retain distinct sampled materials');
    },
  },
  {
    name: 'separate soap bars preserve the gap between products',
    photo: pixels(250, 180, (x, y) => ((x > 20 && x < 95) || (x > 150 && x < 225)) && y > 30 && y < 155 ? rose : white),
    verify: objects => {
      assert.equal(objects.length, 2);
      assert.ok(objects[0].bounds.x + objects[0].bounds.width < objects[1].bounds.x);
    },
  },
  {
    name: 'complex photo does not invent simple product parts',
    photo: cases.find(item => item.name === 'complex photo is retained as relief').photo,
    verify: objects => assert.equal(objects.length, 0),
  },
  {
    name: 'empty white frame cannot become a tightly cropped soap carton',
    photo: pixels(192, 192, () => white),
    verify: objects => assert.equal(objects.length, 0),
  },
  {
    name: 'uniform gray frame cannot become a tightly cropped soap carton',
    photo: pixels(192, 192, () => [210, 208, 206, 255]),
    verify: objects => assert.equal(objects.length, 0),
  },
  {
    name: 'printing on an empty poster margin is not carton thickness',
    photo: cases.find(item => item.name === 'marketing caption stays in the complete photo relief').photo,
    verify: objects => assert.equal(objects.length, 0),
  },
  {
    name: 'unknown oval object keeps its curved image outline', shape: 'general',
    photo: pixels(200, 180, (x, y) => ((x - 100) / 65) ** 2 + ((y - 90) / 55) ** 2 < 1 ? rose : white),
    verify: objects => {
      assert.equal(objects.length, 1); assert.equal(objects[0].kind, 'general');
      assert.ok(objects[0].contour?.length >= 8, 'curved object cannot become a box');
      assert.ok(Math.min(...objects[0].contour.map(point => point.y)) <= 37, 'upper curve remains');
      assert.ok(Math.max(...objects[0].contour.map(point => point.y)) >= 142, 'lower curve remains');
    },
  },
];
for (const item of objectCases) {
  // Exercise the same segmentation and part inference used by the browser.
  const analysis = analysePhotoPixels(item.photo);
  const objects = inferPhotoObjects(item.photo, analysis, item.shape || 'soap');
  item.verify(objects);
  for (const object of objects) {
    assert.ok(object.bounds.width > 0 && object.bounds.height > 0);
    assert.ok(object.bounds.x >= 0 && object.bounds.y >= 0);
    assert.ok(object.bounds.x + object.bounds.width <= item.photo.width);
    assert.ok(object.bounds.y + object.bounds.height <= item.photo.height);
    assert.ok(object.confidence > 0 && object.confidence <= 1);
  }
  console.log(`PASS ${item.name}`);
}

// A bounded, checked-in copy of the real Shopify photograph that exposed the
// petal/carton bug. No network dependency or live catalogue credentials in tests.
const sharp = require('sharp');
const croppedPhoto = await sharp(fileURLToPath(new URL('../qa/fixtures/oriental-lavendar-photo.png', import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const croppedPixels = { width: croppedPhoto.info.width, height: croppedPhoto.info.height, data: new Uint8ClampedArray(croppedPhoto.data) };
const croppedAnalysis = analysePhotoPixels(croppedPixels);
const croppedParts = inferPhotoObjects(croppedPixels, croppedAnalysis, 'soap');
assert.equal(croppedParts.length, 1, 'tightly cropped Oriental Lavendar must reconstruct one physical carton');
assert.equal(croppedParts[0].kind, 'box', 'a complete printed carton must use solid box depth, not photo relief');
assert.ok(croppedParts[0].bounds.width >= croppedPixels.width * .95 && croppedParts[0].bounds.height >= croppedPixels.height * .95, 'recovery must retain the complete package face');
assert.ok(croppedParts[0].confidence >= .75 && croppedParts[0].confidence <= 1);
console.log('PASS real tightly cropped Oriental Lavendar uses the same solid carton family as Rose');
for (const hint of ['general', 'jar', 'bottle']) {
  assert.equal(inferPhotoObjects(croppedPixels, croppedAnalysis, hint).length, 0, `${hint}: a full-frame printed photo does not establish a soap carton`);
}
console.log('PASS tightly cropped carton recovery does not override unrelated shape hints');
for (const handle of ['floral-soap-gift-set', 'wellness-trio-soap-bundle']) {
  const promo = await sharp(fileURLToPath(new URL(`../qa/fixtures/${handle}.png`, import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const promoPixels = { width: promo.info.width, height: promo.info.height, data: new Uint8ClampedArray(promo.data) };
  const promoAnalysis = analysePhotoPixels(promoPixels);
  assert.equal(promoAnalysis.kind, 'relief', `${handle}: promotional composition retains the complete photograph`);
  assert.equal(inferPhotoObjects(promoPixels, promoAnalysis, 'soap').length, 0, `${handle}: marketing artwork must not become a giant box`);
  console.log(`PASS ${handle} remains a photographic composition, not a cropped carton`);
}
const realPhoto = await sharp(fileURLToPath(new URL('../qa/fixtures/damask-photo.png', import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const realPixels = { width: realPhoto.info.width, height: realPhoto.info.height, data: new Uint8ClampedArray(realPhoto.data) };
const realParts = inferPhotoObjects(realPixels, analysePhotoPixels(realPixels), 'soap');
assert.equal(realParts.length, 2, 'real photograph: carton and bar must be distinct objects');
const [carton, soap] = realParts;
assert.equal(carton.kind, 'box'); assert.equal(soap.kind, 'soap');
assert.ok(carton.bounds.x >= 8 && carton.bounds.x <= 11, 'carton starts at its printed package edge');
assert.ok(Math.abs(soap.bounds.x - 101) <= 3, 'soap starts at the physical seam, not a label edge');
assert.ok(carton.bounds.y < soap.bounds.y - 4, 'carton is visibly taller than the adjacent soap');
assert.ok(carton.bounds.y + carton.bounds.height <= 141 && soap.bounds.y + soap.bounds.height <= 141, 'loose petals below the products cannot become geometry');
assert.ok(soap.bounds.x + soap.bounds.width <= 181, 'right-hand petals cannot widen the soap');
assert.ok(carton.color[1] - soap.color[1] > .35, 'the white carton must not inherit the pink soap material');
console.log('PASS real Shopify soap image excludes decorative petals and preserves the white carton');

const tinPhoto = await sharp(fileURLToPath(new URL('../qa/fixtures/rose-tin-photo.png', import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const tinPixels = { width: tinPhoto.info.width, height: tinPhoto.info.height, data: new Uint8ClampedArray(tinPhoto.data) };
const tinAnalysis = analysePhotoPixels(tinPixels);
const tins = inferPhotoObjects(tinPixels, tinAnalysis, 'jar');
assert.equal(tins.length, 1, 'isolated tin must be one physical object');
assert.equal(tins[0].kind, 'jar');
assert.ok(tins[0].bounds.x >= 28 && tins[0].bounds.x <= 34, 'pale cast shadow must not stretch the tin to the left');
assert.ok(tins[0].bounds.x + tins[0].bounds.width >= 154, 'the actual right metal rim must remain');
assert.equal(tins[0].bounds.y, tinAnalysis.bounds.y, 'the actual upper lid arc must remain');
assert.equal(tins[0].bounds.height, tinAnalysis.bounds.height, 'the physical body height must remain');
const unchangedBottle = inferPhotoObjects(tinPixels, tinAnalysis, 'bottle');
assert.deepEqual(unchangedBottle[0].bounds, tinAnalysis.bounds, 'shallow-tin correction must never trim bottle bounds');
console.log('PASS real Shopify tin retains its lid and removes only the pale cast-shadow tail');
const lavenderPhoto = await sharp(fileURLToPath(new URL('../qa/fixtures/lavender-photo.png', import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const lavenderPixels = { width: lavenderPhoto.info.width, height: lavenderPhoto.info.height, data: new Uint8ClampedArray(lavenderPhoto.data) };
const lavenderParts = inferPhotoObjects(lavenderPixels, analysePhotoPixels(lavenderPixels), 'soap');
assert.equal(lavenderParts.length, 2, `pale carton and pale soap need separate objects: ${JSON.stringify(lavenderParts)}`);
assert.equal(lavenderParts[0].kind, 'box'); assert.equal(lavenderParts[1].kind, 'soap');
assert.ok(lavenderParts[1].contour?.length >= 6, 'hexagonal soap must have its own outline');
assert.ok(lavenderParts[0].bounds.x + lavenderParts[0].bounds.width < 122, 'carton must stop before the separate hexagonal soap');
assert.ok(lavenderParts[1].bounds.y >= 76, 'soap must not include empty background above it');
assert.ok(lavenderParts[1].contour.every(point => point.y < 148), 'lavender sprigs below the soap are decorative props');
const unclassifiedLavender = inferPhotoObjects(lavenderPixels, analysePhotoPixels(lavenderPixels), 'general');
assert.equal(unclassifiedLavender.length, 2);
assert.equal(unclassifiedLavender[1].kind, 'general');
assert.ok(unclassifiedLavender[1].contour?.length >= 6, 'polygon detection must not depend on a soap title');
console.log('PASS pale carton and hexagonal soap use separate geometry without their backdrop');
const isolatedCases = [
  { handle: 'rosemary-olive-hair-oil', shape: 'bottle', minX: 53, maxX: 60, maxWidth: 58 },
  { handle: 'cold-pressed-sweet-almond-oil', shape: 'bottle', minX: 59, maxX: 66, maxWidth: 60 },
  { handle: 'facial-ubtan-orange-almond-1', shape: 'jar', minX: 25, maxX: 34, maxWidth: 145 },
  { handle: 'body-ubtan-tea-tree-1', shape: 'jar', minX: 34, maxX: 44, maxWidth: 130, minY: 43, maxY: 49 },
];
for (const item of isolatedCases) {
  const fixture = await sharp(fileURLToPath(new URL(`../qa/fixtures/${item.handle}.png`, import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const source = { width: fixture.info.width, height: fixture.info.height, data: new Uint8ClampedArray(fixture.data) };
  const analysis = analysePhotoPixels(source);
  const parts = inferPhotoObjects(source, analysis, item.shape);
  assert.equal(parts.length, 1, `${item.handle}: dominant vessel remains one object`);
  const part = parts[0];
  assert.equal(part.kind, item.shape);
  assert.ok(part.bounds.x >= item.minX && part.bounds.x <= item.maxX, `${item.handle}: retain the physical vessel's left edge`);
  assert.ok(part.bounds.width < item.maxWidth, `${item.handle}: loose botanicals cannot expand the vessel`);
  if (item.minY !== undefined) {
    assert.ok(part.bounds.y >= item.minY && part.bounds.y <= item.maxY, 'jar must start at the coherent silver lid, excluding the upper herb sprig');
    assert.ok(part.bounds.height > 98, 'exclude the sprig while retaining the visible glass body');
  }
  if (item.shape === 'bottle') {
    assert.ok(part.contour?.length >= 8, 'flat bottle needs its stepped cap and shoulder outline');
    const centre = part.bounds.x + part.bounds.width / 2;
    const cap = part.contour.filter(point => point.y < part.bounds.y + part.bounds.height * .13);
    const body = part.contour.filter(point => point.y > part.bounds.y + part.bounds.height * .30);
    assert.ok(Math.max(...cap.map(point => Math.abs(point.x - centre))) < Math.max(...body.map(point => Math.abs(point.x - centre))) * .88, 'cap must remain visibly narrower than the body');
  }
  console.log(`PASS ${item.handle} excludes surrounding props and preserves the vessel outline`);
}
console.log(`${cases.length + 8 + objectCases.length + isolatedCases.length} photo-model regression checks passed.`);
