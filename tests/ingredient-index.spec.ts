import {expect, test} from '@playwright/test';
import {buildIngredientIndex, findIngredient} from '../src/app/ingredients/ingredient-data';
import type {Product} from '../src/lib/types';

function product(overrides: Partial<Product> = {}): Product {
 return {
  id: 'test-product', handle: 'test-product', title: 'Everyday care', description: '',
  productType: 'Soap', tags: [], availableForSale: true, createdAt: '',
  images: [], shape: 'soap', tone: '#dfd9cc', price: {amount: '100', currencyCode: 'INR'},
  variants: [], story: '', ingredients: [], craft: [], ritual: [], ...overrides,
 };
}

test('ingredient detail resolves an exact story handle before a generated name alias', () => {
 const entries = buildIngredientIndex([product({
  title: 'Rose Soap',
  ingredients: [{handle: 'rose', name: 'Rose clay', description: 'A supplied rose clay story.'}],
 })]);
 expect(entries.map(entry => entry.handle)).toEqual(['catalogue-rose', 'rose']);
 expect(findIngredient(entries, 'rose')?.name).toBe('Rose clay');
 expect(findIngredient(entries, 'catalogue-rose')?.name).toBe('Rose');
 expect(findIngredient(entries, 'Rose clay')?.handle).toBe('rose');
 expect(findIngredient(entries, 'rose-clay')?.handle).toBe('rose');
 expect(findIngredient(entries, 'missing-ingredient')).toBeUndefined();
});

test('generic ingredient-list words do not assert butter or French origin', () => {
 const entries = buildIngredientIndex([product({
  fullIngredientList: 'Cocoa powder, shea extract, green clay',
 })]);
 expect(entries).toEqual([]);
});

test('generic product names do not assert more specific ingredients', () => {
 const entries = buildIngredientIndex([product({
  title: 'Cocoa, Shea and Green Clay Soap',
 })]);
 expect(entries).toEqual([]);
});

test('fully named ingredients remain indexed with their published source', () => {
 const entries = buildIngredientIndex([product({
  fullIngredientList: 'Cocoa butter, shea-butter, French green clay',
 })]);
 expect(entries.map(entry => entry.name)).toEqual(['Cocoa butter', 'French green clay', 'Shea butter']);
 for (const entry of entries) expect(entry.references[0].basis).toBe('Ingredient list');
 const named = buildIngredientIndex([product({title: 'Shea Butter Soap'})]);
 expect(named[0].name).toBe('Shea butter');
 expect(named[0].references[0].basis).toBe('Product name');
});

test('merchant ingredient stories keep their supplied identity', () => {
 const entries = buildIngredientIndex([product({
  ingredients: [
   {handle: 'cocoa-powder', name: 'Cocoa powder', description: 'The supplied cocoa powder description.'},
   {handle: 'green-clay', name: 'Green clay', description: 'The supplied clay description.'},
  ],
 })]);
 expect(entries.map(entry => entry.name)).toEqual(['Cocoa powder', 'Green clay']);
 expect(entries.every(entry => entry.references[0].basis === 'Ingredient story')).toBe(true);
 expect(findIngredient(entries, 'cocoa-powder')?.description).toBe('The supplied cocoa powder description.');
});

