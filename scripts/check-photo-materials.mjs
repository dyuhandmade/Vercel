import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

// Exercise the real browser canvas pipeline using local photos, without Shopify or a dev server.
const require = createRequire(import.meta.url);
const project = fileURLToPath(new URL('../', import.meta.url));
const temporaryRoot = resolve(tmpdir());
const temporary = mkdtempSync(join(temporaryRoot, 'dyu-photo-materials-'));
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
let materialsUrl, modelUrl;
try {
  const compiler = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
  execFileSync(process.execPath, [compiler, '--ignoreConfig', join(project, 'src/lib/photo-materials.ts'), join(project, 'src/lib/photo-model.ts'), '--target', 'ES2020', '--module', 'ESNext', '--lib', 'ES2020,DOM', '--skipLibCheck', '--outDir', temporary], {stdio: ['ignore', 'pipe', 'pipe']});
  const contourUrl = moduleUrl(readFileSync(join(temporary, 'photo-contours.js'), 'utf8'));
  const objectUrl = moduleUrl(readFileSync(join(temporary, 'photo-objects.js'), 'utf8').replace("'./photo-contours'", JSON.stringify(contourUrl)));
  const heldUrl=moduleUrl(readFileSync(join(temporary,'photo-held-container.js'),'utf8'));
  modelUrl = moduleUrl(readFileSync(join(temporary, 'photo-model.js'), 'utf8').replace("'./photo-objects'", JSON.stringify(objectUrl)).replace("'./photo-held-container'",JSON.stringify(heldUrl)));
  materialsUrl = moduleUrl(readFileSync(join(temporary, 'photo-materials.js'), 'utf8'));
} finally {
  // Remove only the fresh temporary directory belonging to this invocation.
  assert.equal(dirname(resolve(temporary)), temporaryRoot);
  assert.ok(basename(temporary).startsWith('dyu-photo-materials-'));
  rmSync(temporary, {recursive: true, force: true});
}

const fixtures = [
  {name: 'Camphora', file: 'qa/fixtures/camphora-photo.png', family: 'beige'},
  {name: 'Damask Rose', file: 'qa/fixtures/damask-photo.png', family: 'pink'},
  {name: 'Tea Tree', file: 'qa/fixtures/tea-tree-cold-processed-soap.png', family: 'green'},
].map(({file, ...fixture}) => ({...fixture, url: `data:image/png;base64,${readFileSync(join(project, file)).toString('base64')}`}));

const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage();
  const results = await page.evaluate(async ({materialsUrl, modelUrl, fixtures}) => {
    const {createInferredSurface} = await import(materialsUrl);
    const {preparePhotoModel} = await import(modelUrl);
    const results = [];
    const verify = (condition, message) => {if (!condition) throw new Error(message);};
    const test = async (name, run) => {
      try {await run(); results.push({name, passed: true});}
      catch (error) {results.push({name, passed: false, error: String(error.message ?? error)});}
    };
    const stats = (canvas, region = [.2, .2, .75, .7]) => {
      const {width, height} = canvas;
      const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
      const samples = [];
      for (let y = Math.floor(height * region[1]); y < height * region[3]; y++) {
        for (let x = Math.floor(width * region[0]); x < width * region[2]; x++) {
          const i = (y * width + x) * 4;
          samples.push([data[i], data[i + 1], data[i + 2]]);
        }
      }
      const mean = [0, 1, 2].map(c => samples.reduce((sum, rgb) => sum + rgb[c], 0) / samples.length);
      return {mean, range: Math.max(...samples.map(c => c[0])) - Math.min(...samples.map(c => c[0]))};
    };
    const checkSurface = surface => {
      verify(Number.isFinite(surface.roughness) && surface.roughness >= 0 && surface.roughness <= 1, 'invalid roughness');
      verify(Number.isFinite(surface.metalness) && surface.metalness >= 0 && surface.metalness <= 1, 'invalid metalness');
      for (const key of ['back', 'side', ...(surface.bump ? ['bump'] : [])]) {
        const canvas = surface[key];
        verify(canvas.width > 0 && canvas.height > 0 && canvas.width <= 384 && canvas.height <= 384, `${key}: invalid texture dimensions`);
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 3; i < data.length; i += 4) verify(data[i] === 255, `${key}: transparent texel`);
      }
    };
    const imageFrom = async canvas => {
      const image = new Image(); image.src = canvas.toDataURL('image/png'); await image.decode(); return image;
    };
    const synthetic = async (band, mode = 'band') => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d');
      context.fillStyle = 'rgb(241,240,238)'; context.fillRect(0, 0, 256, 256);
      if (band) {
        context.fillStyle = `rgb(${band.join(',')})`;
        if (mode === 'gradient') {
          const shadow = context.createLinearGradient(0, 190, 0, 256);
          shadow.addColorStop(0, 'rgb(241,240,238)'); shadow.addColorStop(1, `rgb(${band.join(',')})`);
          context.fillStyle = shadow; context.fillRect(0, 190, 256, 66);
        } else if (mode === 'text') {
          for (let x = 40; x < 200; x += 25) context.fillRect(x, 221, 8, 10);
        } else if (mode === 'rules') {
          context.fillRect(0, 218, 256, 4); context.fillRect(0, 242, 256, 4);
        } else {
          context.fillRect(0, 218, 256, 28);
          if (mode === 'lettering') {
            context.fillStyle = 'rgb(241,240,238)'; context.fillRect(40, 226, 180, 8);
          }
        }
      }
      const photo = await imageFrom(canvas);
      return {photo, surface: createInferredSurface(photo, {x: 0, y: 0, width: 1, height: 1}, 'box', [241 / 255, 240 / 255, 238 / 255])};
    };
    const upper = canvas => stats(canvas, [.2, .3, .72, .6]);
    const lower = canvas => stats(canvas, [.2, .87, .72, .92]);
    const chromaDifference = (a, b) => {
      const difference = a.map((value, channel) => value - b[channel]);
      return Math.max(...difference) - Math.min(...difference);
    };

    for (const fixture of fixtures) await test(`${fixture.name}: photographed footer remains visible on the complete rear texture`, async () => {
      const photo = await preparePhotoModel(fixture.url, 'soap');
      const carton = photo.objects.find(part => part.kind === 'box');
      verify(carton, 'photograph must produce a carton');
      const {bounds} = carton;
      const surface = createInferredSurface(photo.photo, {x: bounds.x / photo.analysis.width, y: bounds.y / photo.analysis.height, width: bounds.width / photo.analysis.width, height: bounds.height / photo.analysis.height}, 'box', carton.color);
      checkSurface(surface);
      const top = upper(surface.back).mean;
      const bottom = (fixture.family === 'green' ? stats(surface.back, [.2, .91, .72, .97]) : lower(surface.back)).mean;
      if (fixture.family === 'beige') {
        verify((bottom[0] - bottom[2]) - (top[0] - top[2]) > 9, `missing warm beige footer: paper ${top}, footer ${bottom}`);
        verify(bottom[0] >= bottom[1] && bottom[1] > bottom[2], 'footer must retain its warm photographed color');
      } else if (fixture.family === 'green') {
        verify(Math.max(...bottom) < 105, `missing dark green footer interrupted by pale front lettering: footer ${bottom}`);
        verify(bottom[1] - bottom[0] > 12 && bottom[1] - bottom[2] > 10, `footer lost its green photographed tint: ${bottom}`);
      } else {
        verify((bottom[0] - bottom[1]) - (top[0] - top[1]) > 25, `missing pink footer: paper ${top}, footer ${bottom}`);
      }
      verify(upper(surface.back).range < 18, 'unseen panel must remain unprinted paper without copied labels');
    });

    for (const [name, color] of [['pale warm', [224, 219, 207]], ['pale cool', [207, 219, 224]], ['pastel lavender', [221, 209, 226]]]) {
      await test(`${name} packaging stripe: low-chroma color survives on the rear`, async () => {
        const {surface} = await synthetic(color); checkSurface(surface);
        const top = upper(surface.back).mean, bottom = lower(surface.back).mean;
        verify(chromaDifference(bottom, top) > 8, `pastel stripe discarded: paper ${top}, footer ${bottom}`);
        const expected = color.map((v, i) => v - [241, 240, 238][i]);
        const actual = bottom.map((v, i) => v - top[i]);
        verify(expected.reduce((sum, v, i) => sum + v * actual[i], 0) > 0, 'stripe hue was inverted');
      });
    }

    for (const [name, color] of [['dark green', [26, 42, 30]], ['burgundy', [65, 28, 39]], ['charcoal', [35, 36, 35]]]) {
      await test(`${name} packaging stripe: broad dark footer survives on the rear`, async () => {
        const {surface} = await synthetic(color); checkSurface(surface);
        const top = upper(surface.back).mean, bottom = lower(surface.back).mean;
        verify(top.every(value => value > 230), 'dark footer contaminated the unprinted paper palette');
        verify(bottom.every((value, channel) => Math.abs(value - color[channel]) < 8), `dark stripe discarded or changed: expected ${color}, footer ${bottom}`);
        verify(upper(surface.back).range < 18, 'dark footer introduced fake printing on the paper panel');
      });
    }

    await test('dark footer with four sampled rows of pale lettering retains its solid material color', async () => {
      const color = [26, 42, 30], {surface} = await synthetic(color, 'lettering');
      checkSurface(surface);
      const bottom = lower(surface.back);
      verify(bottom.mean.every((value, channel) => Math.abs(value - color[channel]) < 8), `lettering interrupted the dark band: ${bottom.mean}`);
      verify(bottom.range < 18, 'front lettering was copied onto the unseen rear');
    });

    for (const [name, color, mode] of [['plain unprinted paper', undefined, 'band'], ['neutral cast shadow', [215, 214, 212], 'band'], ['neutral gray gradient shadow', [185, 184, 182], 'gradient'], ['sparse lower printing', [45, 42, 42], 'text'], ['separated dark rules', [26, 42, 30], 'rules']]) {
      await test(`${name}: no invented rear color band or printing`, async () => {
        const {surface} = await synthetic(color, mode); checkSurface(surface);
        const top = upper(surface.back), bottom = lower(surface.back);
        verify(chromaDifference(bottom.mean, top.mean) < 2, `spurious color stripe: paper ${top.mean}, footer ${bottom.mean}`);
        verify(Math.abs(bottom.mean[0] - top.mean[0]) < 3, 'shadow or sparse text was copied onto the rear');
        verify(top.range < 18 && bottom.range < 18, 'procedural rear has fake markings');
      });
    }

    for (const kind of ['soap', 'bottle', 'jar', 'general']) await test(`${kind}: inferred sides and reverse are fully opaque usable textures`, async () => {
      const {photo} = await synthetic([216, 191, 158]);
      const surface = createInferredSurface(photo, {x: 0, y: 0, width: 1, height: 1}, kind, [.84, .75, .62]);
      checkSurface(surface);
      verify(stats(surface.back).range > 0, 'surface lost all material variation');
    });
    return results;
  }, {materialsUrl, modelUrl, fixtures});
  for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? `: ${result.error}` : ''}`);
  assert.equal(results.filter(result => !result.passed).length, 0, 'photo material regressions failed');
  console.log(`${results.length} photo-material checks passed.`);
} finally {
  await browser.close();
}
