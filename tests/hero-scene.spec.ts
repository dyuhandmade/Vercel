import {test, expect} from '@playwright/test';
import {heroBotanical, heroBundleMembers, heroLayout, selectHeroProduct, type HeroProduct} from '../src/lib/hero-scene';
import type {PhotoModelMetadata} from '../src/lib/photo-model';

function product(overrides: Partial<HeroProduct> = {}): HeroProduct {
  return {id: 'rose', handle: 'rose', title: 'Damask Rose Soap', productType: 'Cold processed Soap', tags: [], shape: 'soap', tone: '#c48383', image: '/rose.png', images: [], ingredients: [], ...overrides};
}

test('the hero follows the selected category and skips unavailable sources', () => {
  const missing = product({id: 'missing', image: undefined});
  const rose = product();
  const oil = product({id: 'oil', productType: 'Facial Oil', image: undefined, model: '/oil.glb'});
  const catalog = [missing, rose, oil];
  expect(selectHeroProduct(catalog, ' facial oil ')).toBe(oil);
  expect(selectHeroProduct(catalog, 'Not a category')).toBe(rose);
  expect(selectHeroProduct(catalog)).toBe(rose);
  expect(selectHeroProduct([missing])).toBeUndefined();
  expect(selectHeroProduct([])).toBeUndefined();
  expect(selectHeroProduct([product({image: undefined, images: [{url: '/gallery.png'}]})])).toBeTruthy();
  expect(selectHeroProduct([{...missing, demo: true}])).toBeTruthy();
});

test('botanical names use the product identity before supporting ingredients', () => {
  expect(heroBotanical(product({title: 'Rosemary Olive Hair Oil', ingredients: [{name: 'Rose extract', description: ''}]}))).toBe('rosemary');
  expect(heroBotanical(product({title: 'Lavendar Haze', ingredients: [{name: 'Coconut oil', description: ''}]}))).toBe('lavender');
  expect(heroBotanical(product({title: 'Cold Pressed Sweet Almond Oil'}))).toBe('almond');
  expect(heroBotanical(product({title: 'Moringa Oil'}))).toBe('moringa');
  expect(heroBotanical(product({title: 'Tea-Tree Trip'}))).toBe('tea-tree');
  expect(heroBotanical(product({title: 'Orange Ubtan'}))).toBe('citrus');
  expect(heroBotanical(product({title: 'Red Sandalwood'}))).toBe('sandalwood');
  expect(heroBotanical(product({title: 'Plain Oil', ingredients: [{name: 'Coconut oil', description: ''}]}))).toBe('coconut');
  expect(heroBotanical(product({title: 'Plain Balm', tags: ['lavender']}))).toBe('lavender');
  expect(heroBotanical(product({title: 'Plain Balm'}))).toBe('botanical');
});

test('compact jars and bottles have smaller pedestals than a soap ensemble', () => {
  const soap = heroLayout('soap'), oil = heroLayout('bottle'), jar = heroLayout('jar');
  expect(soap.width).toBeCloseTo(2.3);
  expect(oil.height).toBeCloseTo(2.1);
  expect(jar.width).toBeCloseTo(1.5);
  expect(jar.height).toBeLessThanOrEqual(1.3);
  expect(oil.radius).toBeLessThan(soap.radius);
  expect(jar.radius).toBeLessThan(soap.radius);
  for (const layout of [soap, oil, jar]) {
    expect(layout.productY - layout.height / 2).toBeCloseTo(.09);
    expect(layout.radius).toBeGreaterThan(Math.hypot(layout.width / 2, layout.depth / 2));
  }
});

test('real model proportions drive uniform scaling and pedestal bounds', () => {
  const metadata: PhotoModelMetadata = {kind: 'volume', width: 1.1, height: 2, depth: .8, confidence: .9};
  const layout = heroLayout('bottle', metadata);
  expect(layout.width / layout.height).toBeCloseTo(metadata.width / metadata.height);
  expect(layout.depth / layout.height).toBeCloseTo(metadata.depth / metadata.height);
  expect(layout.productY - layout.height / 2).toBeCloseTo(.09);
  const wide = heroLayout('soap', {...metadata, width: 10, depth: 10});
  expect(wide.radius).toBeLessThanOrEqual(2);
  expect(wide.radius).toBeGreaterThanOrEqual(.9);
  expect(wide.width / wide.depth).toBeCloseTo(1);
});

test('invalid reconstruction measurements cannot produce invalid scene coordinates', () => {
  const layout = heroLayout('general', {kind: 'volume', width: NaN, height: Infinity, depth: -1, confidence: 0});
  expect(layout).toEqual(heroLayout('general'));
  for (const value of Object.values(layout)) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThan(0);
  }
});

test('promotional bundle artwork uses only the verified complete set of real members',()=>{
 const bundle=product({handle:'wellness-trio-soap-bundle'});
 const handles=['tea-tree-cold-processed-soap','camphora-pink-salt','charcoal-mint-cold-processed-soap'];
 const members=handles.map(handle=>product({id:handle,handle}));
 expect(heroBundleMembers(bundle,[bundle,...members]).map(member=>member.handle)).toEqual(handles);
 expect(heroBundleMembers(bundle,members.slice(0,2))).toEqual([]);
 expect(heroBundleMembers({...bundle,model:'/bundle.glb'},members)).toEqual([]);
 expect(heroBundleMembers(product({handle:'unverified-bundle'}),members)).toEqual([]);
});
