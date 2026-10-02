import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import * as THREE from 'three';

const require = createRequire(import.meta.url);
const project = fileURLToPath(new URL('../', import.meta.url));
const temporaryRoot = resolve(tmpdir());
const temporary = mkdtempSync(join(temporaryRoot, 'dyu-photo-solids-'));
let solids, vessels, photos, objects;
try {
  const compiler = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
  execFileSync(process.execPath, [compiler, '--ignoreConfig', join(project, 'src/lib/photo-vessel-geometry.ts'), '--target', 'ES2020', '--module', 'ESNext', '--lib', 'ES2020,DOM', '--skipLibCheck', '--outDir', temporary], {stdio: ['ignore', 'pipe', 'pipe']});
  writeFileSync(join(temporary, 'package.json'), '{"type":"module"}');
  // Resolve the real installed Three runtime, while keeping generated compiler output temporary.
  for (const file of readdirSync(temporary).filter(name => name.endsWith('.js'))) {
    const source = readFileSync(join(temporary, file), 'utf8').replace(/from\s*(['"])([^'"]+)\1/g, (statement, quote, specifier) => {
      if (specifier.startsWith('./')) return `from ${quote}${specifier}.js${quote}`;
      if (specifier === 'three') return `from ${quote}${pathToFileURL(join(dirname(require.resolve('three')), 'three.module.js')).href}${quote}`;
      if (specifier.startsWith('three/')) return `from ${quote}${pathToFileURL(require.resolve(specifier)).href}${quote}`;
      return statement;
    });
    writeFileSync(join(temporary, file), source);
  }
  [solids, vessels, photos, objects] = await Promise.all(['photo-solid-geometry', 'photo-vessel-geometry', 'photo-model', 'photo-objects'].map(name => import(pathToFileURL(join(temporary, `${name}.js`)).href)));
} finally {
  // Remove only this invocation's newly created directory immediately inside the OS temp root.
  assert.equal(dirname(resolve(temporary)), temporaryRoot);
  assert.ok(basename(temporary).startsWith('dyu-photo-solids-'));
  rmSync(temporary, {recursive: true, force: true});
}

const {createPhotoSolid, layoutPhotoObjects} = solids;
const {createPhotoVessel} = vessels;
let checks = 0;
const test = (name, verify) => { verify(); checks++; console.log(`PASS ${name}`); };
const approx = (actual, expected, tolerance = 1e-5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

function validGeometry(geometry, materialCount = 1) {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
  assert.ok(position.count > 12);
  assert.equal(position.count, normal.count);
  assert.equal(position.count, uv.count);
  for (const attribute of [position, normal, uv]) assert.ok(Array.from(attribute.array).every(Number.isFinite), 'non-finite geometry attribute');
  assert.ok(Array.from(uv.array).every(value => value >= -1e-5 && value <= 1 + 1e-5), 'UV outside texture bounds');
  const size = geometry.index?.count ?? position.count;
  if (geometry.groups.length) {
    let end = 0;
    for (const group of geometry.groups) {
      assert.equal(group.start, end, 'material groups must cover the mesh without a gap or overlap');
      assert.ok(group.count > 0 && group.count % 3 === 0);
      assert.ok(group.materialIndex >= 0 && group.materialIndex < materialCount);
      end += group.count;
    }
    assert.equal(end, size);
  }
}

/** Welding positions across material seams tests physical closure, not buffer layout. */
function closedMesh(geometries) {
  const edges = new Map();
  let triangles = 0;
  const key = (attribute, index) => [attribute.getX(index), attribute.getY(index), attribute.getZ(index)].map(value => Math.round(value * 10000)).join(',');
  for (const geometry of geometries) {
    const position = geometry.getAttribute('position'), index = geometry.index;
    const count = index?.count ?? position.count;
    for (let i = 0; i < count; i += 3) {
      const vertices = [0, 1, 2].map(j => key(position, index ? index.getX(i + j) : i + j));
      if (new Set(vertices).size < 3) continue; // The usual degenerate triangles at a lathe pole.
      triangles++;
      for (let j = 0; j < 3; j++) {
        const edge = [vertices[j], vertices[(j + 1) % 3]].sort().join('|');
        edges.set(edge, (edges.get(edge) ?? 0) + 1);
      }
    }
  }
  assert.ok(triangles > 50);
  const open = [...edges.values()].filter(count => count !== 2);
  assert.equal(open.length, 0, `${open.length} boundary/non-manifold edges in combined mesh`);
}

function silhouette(bounds, radiusAt) {
  const width = 200, height = 200, mask = new Uint8Array(width * height);
  const cx = bounds.x + bounds.width / 2;
  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    const radius = radiusAt((y - bounds.y) / (bounds.height - 1)) * bounds.width / 2;
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) if (Math.abs(x - cx) <= radius) mask[y * width + x] = 1;
  }
  return {width, height, mask, bounds, kind: 'volume', confidence: 1, color: [.7, .65, .6]};
}
const object = (kind, bounds, extra = {}) => ({kind, bounds, confidence: 1, color: [.7, .65, .6], ...extra});

test('jar lid: one-sided foliage joined to the upper silhouette does not flatten the ellipse', () => {
  const bounds = {x: 35, y: 30, width: 122, height: 128};
  const clean = silhouette(bounds, t => t < .27 ? Math.sqrt(Math.max(.01, 1 - ((t - .27) / .27) ** 2)) : 1);
  // Align the raster's symmetry axis with the half-pixel center of this crop.
  for (let y = bounds.y; y < bounds.y + bounds.height; y++) for (let dx = 0; dx < bounds.width / 2; dx++) {
    const a = y * clean.width + bounds.x + dx, b = y * clean.width + bounds.x + bounds.width - 1 - dx;
    clean.mask[a] = clean.mask[b] = clean.mask[a] & clean.mask[b];
  }
  const obscured = {...clean, mask: clean.mask.slice()};
  // The background segmentation fills each row between the leaf and the lid.
  // This is the failure mode of the actual Tea Tree Ubtan product photograph.
  for (let y = bounds.y + 1; y < bounds.y + bounds.height * .2; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width / 2; x++) obscured.mask[y * obscured.width + x] = 1;
  }
  const part = object('jar', bounds);
  const cleanRatio = vessels.jarEllipseRatio(part, clean);
  approx(vessels.jarEllipseRatio(part, obscured), cleanRatio, .025);
  assert.ok(cleanRatio > .5 && cleanRatio < .6, 'known lid ellipse was not recovered');
});

for (const [name, bounds] of [['upright glass jar', {x: 35, y: 30, width: 122, height: 128}], ['shallow metal tin', {x: 30, y: 50, width: 132, height: 84}]]) {
  const analysis = silhouette(bounds, t => t < .27 ? Math.sqrt(Math.max(.01, 1 - ((t - .27) / .27) ** 2)) : t > .9 ? 1 - (t - .9) * 1.1 : 1);
  const part = object('jar', bounds), layout = layoutPhotoObjects([part]);
  const vessel = createPhotoVessel(part, analysis, layout);
  test(`${name}: complete cylindrical wall and closed four-surface mesh`, () => {
    assert.deepEqual(vessel.parts.map(p => p.surface).sort(), ['body', 'bottom', 'lid', 'top']);
    vessel.parts.forEach(p => validGeometry(p.geometry));
    closedMesh(vessel.parts.map(p => p.geometry));
    const tilt = Math.asin(2 * vessel.profile.depthShift * layout.height / layout.width);
    const body = vessel.parts.find(p => p.surface === 'body').geometry.clone().rotateX(-tilt);
    body.computeBoundingBox();
    const size = body.boundingBox.getSize(new THREE.Vector3());
    approx(size.x, size.z, 1e-4); // A real round vessel must not flatten in side view.
    assert.ok(size.z > layout.width * .9, 'vessel depth is a shallow photo extrusion');
    assert.ok(vessel.depth >= size.z * .85 && Number.isFinite(vessel.depth));
    body.dispose();
  });
  test(`${name}: circular lid stays on one plane with finite material coordinates`, () => {
    const top = vessel.parts.find(p => p.surface === 'top').geometry;
    const p = top.getAttribute('position'), n = top.getAttribute('normal');
    const center = new THREE.Vector3().fromBufferAttribute(p, 0), normal = new THREE.Vector3().fromBufferAttribute(n, 0);
    let radius;
    for (let i = 1; i < p.count; i++) {
      const relative = new THREE.Vector3().fromBufferAttribute(p, i).sub(center);
      approx(relative.dot(normal), 0, 1e-5);
      radius ??= relative.length();
      approx(relative.length(), radius, 1e-5);
    }
    assert.ok(radius > layout.width * .45, 'lid is not a full circular surface');
    for (const value of Object.values(vessel.profile).filter(value => typeof value === 'number')) assert.ok(Number.isFinite(value));
  });
  vessel.parts.forEach(p => p.geometry.dispose());
}

test('dropper bottle: full circular depth, closed ends and complete material groups', () => {
  const bounds = {x: 74, y: 15, width: 48, height: 165};
  const analysis = silhouette(bounds, t => t < .22 ? .38 : t < .32 ? .52 : t < .4 ? .52 + (t - .32) * 6 : .98);
  const part = object('bottle', bounds), layout = layoutPhotoObjects([part]);
  const result = createPhotoSolid(part, analysis, layout);
  validGeometry(result.geometry, result.materialOrder.length);
  closedMesh([result.geometry]);
  result.geometry.computeBoundingBox();
  const size = result.geometry.boundingBox.getSize(new THREE.Vector3());
  approx(size.x, size.z, 1e-4);
  assert.ok(size.z > layout.width * .9);
  result.geometry.dispose();
});

test('carton: physical depth, closed softened corners and six-face material coverage', () => {
  const bounds = {x: 20, y: 20, width: 95, height: 100};
  const analysis = silhouette(bounds, () => 1), part = object('box', bounds);
  const result = createPhotoSolid(part, analysis, layoutPhotoObjects([part]));
  validGeometry(result.geometry, result.materialOrder.length);
  closedMesh([result.geometry]);
  assert.ok(result.depth > .2 && result.depth < .8);
  assert.ok(result.materialOrder.includes('front') && result.materialOrder.includes('back') && result.materialOrder.includes('side'));
  result.geometry.dispose();
});

const sharp = require('sharp');
const cartonCases = [];
for (const [name, file] of [['Oriental Lavendar', 'oriental-lavendar-photo.png'], ['Damask Rose', 'damask-photo.png']]) {
  const photo = await sharp(join(project, 'qa/fixtures', file)).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const actualPixels = {width: photo.info.width, height: photo.info.height, data: new Uint8ClampedArray(photo.data)};
  const analysis = photos.analysePhotoPixels(actualPixels), parts = objects.inferPhotoObjects(actualPixels, analysis, 'soap');
  cartonCases.push({name, analysis, parts});
}
test('actual Oriental Lavendar: closed six-face carton has comparable thickness to Damask Rose', () => {
  const relativeDepths = cartonCases.map(({name, analysis, parts}) => {
    const carton = parts.find(part => part.kind === 'box');
    assert.ok(carton, `${name}: an identified carton is required, not a photographic relief`);
    const layout = layoutPhotoObjects(parts), result = createPhotoSolid(carton, analysis, layout);
    validGeometry(result.geometry, result.materialOrder.length);
    closedMesh([result.geometry]);
    assert.deepEqual(result.materialOrder, ['side', 'side', 'side', 'side', 'front', 'back']);
    result.geometry.computeBoundingBox();
    const size = result.geometry.boundingBox.getSize(new THREE.Vector3());
    approx(size.z, result.depth);
    const relativeDepth = size.z / Math.min(size.x, size.y);
    assert.ok(relativeDepth >= .29 && relativeDepth <= .33, `${name}: carton collapsed to a thin image plane`);
    result.geometry.dispose();
    return relativeDepth;
  });
  approx(relativeDepths[0], relativeDepths[1], .02);
});
const fixture = await sharp(join(project, 'qa/fixtures/lavender-photo.png')).ensureAlpha().raw().toBuffer({resolveWithObject: true});
const pixels = {width: fixture.info.width, height: fixture.info.height, data: new Uint8ClampedArray(fixture.data)};
const haze = photos.analysePhotoPixels(pixels), hazeParts = objects.inferPhotoObjects(pixels, haze, 'soap');
test('actual Lavender Haze: shaped soap leaves background corners empty and stays watertight', () => {
  assert.equal(hazeParts.length, 2);
  const soap = hazeParts.find(p => p.kind === 'soap');
  assert.ok(soap?.contour?.length >= 6, 'hexagonal soap must not become its rectangular crop');
  const layout = layoutPhotoObjects(hazeParts), result = createPhotoSolid(soap, haze, layout);
  validGeometry(result.geometry, result.materialOrder.length);
  closedMesh([result.geometry]);
  const mesh = new THREE.Mesh(result.geometry, new THREE.MeshBasicMaterial({side: THREE.DoubleSide}));
  mesh.updateMatrixWorld(true);
  const width = soap.bounds.width * layout.scale, height = soap.bounds.height * layout.scale;
  const ray = new THREE.Raycaster();
  for (const x of [-.47, .47]) for (const y of [-.47, .47]) {
    ray.set(new THREE.Vector3(x * width, y * height, 10), new THREE.Vector3(0, 0, -1));
    assert.equal(ray.intersectObject(mesh).length, 0, 'background corner is occupied by product geometry');
  }
  ray.set(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, -1));
  assert.ok(ray.intersectObject(mesh).length > 0, 'soap center must remain solid');
  mesh.material.dispose(); result.geometry.dispose();
});

test('unseen asymmetric contour: generated geometry preserves silhouette without a product-specific template', () => {
  const bounds = {x: 30, y: 25, width: 100, height: 130};
  const contour = [{x: 80, y: 25}, {x: 130, y: 75}, {x: 110, y: 150}, {x: 30, y: 155}, {x: 45, y: 65}];
  const part = object('general', bounds, {contour});
  const result = createPhotoSolid(part, silhouette(bounds, () => 1), layoutPhotoObjects([part]));
  validGeometry(result.geometry, result.materialOrder.length);
  closedMesh([result.geometry]);
  assert.ok(result.geometry.groups.length < 35, 'material grouping should not create a draw call per triangle');
  result.geometry.dispose();
});

for (const [name, file] of [['Body Ubtan', 'body-ubtan-photo.png'], ['Body Ubtan with foliage', 'body-ubtan-tea-tree-1.png'], ['Mud Face Wash', 'mud-face-wash.png'], ['Rose body-butter tin', 'rose-tin-photo.png']]) {
  const image = await sharp(join(project, 'qa/fixtures', file)).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const actualPixels = {width: image.info.width, height: image.info.height, data: new Uint8ClampedArray(image.data)};
  const analysis = photos.analysePhotoPixels(actualPixels), parts = objects.inferPhotoObjects(actualPixels, analysis, 'jar');
  test(`${name}: photographed ellipse yields a closed vessel with usable body and lid regions`, () => {
    assert.equal(parts.length, 1);
    assert.equal(parts[0].kind, 'jar');
    const vessel = createPhotoVessel(parts[0], analysis, layoutPhotoObjects(parts));
    vessel.parts.forEach(p => validGeometry(p.geometry));
    closedMesh(vessel.parts.map(p => p.geometry));
    const p = vessel.profile;
    assert.ok(p.lidTop > 0 && p.lidBottom > p.lidTop);
    assert.ok(p.bodyBottom > p.bodyTop && p.bodyBottom < 1);
    approx(p.bodyTop, p.lidBottom);
    assert.ok(p.lidEllipse.height > .1 && p.lidEllipse.height < .8);
    if (name.startsWith('Body Ubtan')) {
      // Both photographs show the same lid at almost the same camera angle.
      // Its projected short axis is about half its width, even with a leaf
      // touching the upper left. A .32 crop-height estimate samples metal and
      // green lid artwork as body texture when the vessel is turned around.
      const lidAspect = p.lidEllipse.height * parts[0].bounds.height / parts[0].bounds.width;
      assert.ok(lidAspect > .46 && lidAspect < .54, `incorrect lid/body texture boundary: ellipse aspect ${lidAspect}`);
    }
    if (name === 'Mud Face Wash') {
      const b = parts[0].bounds, bottom = b.y + b.height;
      assert.ok(bottom >= 149 && bottom <= 158, `warm glass body was truncated or foreground props included: bottom ${bottom}`);
      const tilt = Math.asin(p.lidEllipse.height * b.height / b.width);
      const body = vessel.parts.find(part => part.surface === 'body').geometry.clone().rotateX(-tilt);
      body.computeBoundingBox();
      const size = body.boundingBox.getSize(new THREE.Vector3());
      assert.ok(size.y / size.x > .45, 'upright glass body collapsed into a shallow tin');
      assert.ok(size.y / size.x < .8, 'foreground props inflated the glass body');
      body.dispose();
    }
    if (process.argv.includes('--profiles')) console.log(JSON.stringify({name, bounds: parts[0].bounds, ellipse: vessels.jarEllipseRatio(parts[0], analysis), profile: p, depth: vessel.depth}));
    vessel.parts.forEach(p => p.geometry.dispose());
  });
}
console.log(`${checks} photo-solid geometry checks passed.`);
