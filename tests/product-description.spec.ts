import {test,expect} from '@playwright/test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {productDescriptionParagraphs} from '../src/lib/product-description';

// Use React's JSX transform for the actual renderer, not Playwright component descriptors.
const previousTsxLoader=require.extensions['.tsx'];
const {transformSync}=require('next/dist/compiled/babel/core');
require.extensions['.tsx']=(loadedModule,filename)=>{
 const {code}=transformSync(readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}],require('next/dist/compiled/babel/preset-typescript')],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]});
 (loadedModule as NodeModule&{_compile:(code:string,filename:string)=>void})._compile(code,filename);
};
const ProductDescription=(require('../src/components/ProductDescription') as typeof import('../src/components/ProductDescription')).default;
require.extensions['.tsx']=previousTsxLoader;

test('Shopify paragraphs and attributed breaks retain distinct text boundaries',()=>{
 const html='<p>Made in small batches<br data-mce-fragment="1">✔ First benefit<br class="note" data-label="a > b"/>✔ Second benefit</p><p>Comfort for skin.</p><h3>Best For</h3><p>Daily care.</p>';
 expect(productDescriptionParagraphs(html)).toEqual(['Made in small batches\n✔ First benefit\n✔ Second benefit','Comfort for skin.','Best For','Daily care.']);
 expect(productDescriptionParagraphs('Before<div>After</div>')).toEqual(['Before','After']);
});

test('unordered, ordered and paragraph-wrapped list items remain readable',()=>{
 expect(productDescriptionParagraphs('<ul><li>First <strong>item</strong></li><li>Second item</li></ul><ol><li>Wash</li><li>Rinse</li></ol>'))
  .toEqual(['• First item','• Second item','1. Wash','2. Rinse']);
 expect(productDescriptionParagraphs('<ul><li><p>First</p></li><li><p>Second</p></li></ul>')).toEqual(['• First','• Second']);
 expect(productDescriptionParagraphs('<ol start="3"><li>Third</li><li value="7">Seventh</li><li>Eighth</li></ol>')).toEqual(['3. Third','7. Seventh','8. Eighth']);
});

test('entities decode once after tags, scripts and comments are removed',()=>{
 const html='<script>window.bad=true</script><!-- hidden --><style>body{display:none}</style><p>&lt;img src=x onerror=alert(1)&gt; &amp; &#x2714; &#10003; &amp;lt;literal&amp;gt;</p><a href="javascript:alert(1)">Visible link label</a>';
 expect(productDescriptionParagraphs(html)).toEqual(['<img src=x onerror=alert(1)> & ✔ ✓ &lt;literal&gt;','Visible link label']);
});

test('unknown and invalid numeric entities remain literal without crashing',()=>{
 expect(productDescriptionParagraphs('<p>&unknown; &#0; &#xD800; &#1114112; &#x1F331;</p>'))
  .toEqual(['&unknown; &#0; &#xD800; &#1114112; 🌱']);
});

test('missing or unusable HTML uses native plain text without parsing it as markup',()=>{
 const plain='Use < 5 drops & leave > 2 minutes.\nSecond line.\n\nLiteral <em>text</em>.';
 for(const html of [undefined,'','  ','<p>&nbsp;</p>','<script>hidden</script><br data-fragment="1">']){
  expect(productDescriptionParagraphs(html,plain)).toEqual(['Use < 5 drops & leave > 2 minutes.\nSecond line.','Literal <em>text</em>.']);
 }
 expect(productDescriptionParagraphs('', '')).toEqual([]);
});

test('long merchant description text is preserved without an implicit display cap',()=>{
 const text='Botanical care. '.repeat(2000)+'Final supplied detail.';
 expect(productDescriptionParagraphs(`<p>${text}</p>`)).toEqual([text]);
});

test('actual description renderer uses separate escaped pre-line paragraphs and safe fallback',()=>{
 const descriptionParagraphs=productDescriptionParagraphs('<p>First<br data-fragment="1">Second</p><p>&lt;img src=x onerror=alert(1)&gt;</p>');
 const output=renderToStaticMarkup(createElement(ProductDescription,{product:{description:'Unchanged native summary',descriptionParagraphs}}));
 expect(output).toBe('<p style="white-space:pre-line">First\nSecond</p><p style="white-space:pre-line">&lt;img src=x onerror=alert(1)&gt;</p>');
 expect(output).not.toContain('<img');
 expect(renderToStaticMarkup(createElement(ProductDescription,{product:{description:'Use < 5 drops.\n\nNext paragraph.'}})))
  .toBe('<p style="white-space:pre-line">Use &lt; 5 drops.</p><p style="white-space:pre-line">Next paragraph.</p>');
 expect(renderToStaticMarkup(createElement(ProductDescription,{product:{description:'',descriptionParagraphs:[]},fallback:'Ask DYU.'})))
  .toBe('<p style="white-space:pre-line">Ask DYU.</p>');
});
