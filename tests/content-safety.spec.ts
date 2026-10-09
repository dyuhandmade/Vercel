import {test,expect} from '@playwright/test';
import {normalizeContentSection,plainText,safeImage,safeLink,textList} from '../src/lib/content-safety';
import {productPresentation,productStoryItems,productText,type ProductMetafield} from '../src/lib/product-content';

test('carousel and hero controls preserve explicit false and reject unsupported values',()=>{
 const parse=(values:Record<string,string>)=>normalizeContentSection({handle:'home-hero',fields:Object.entries(values).map(([key,value])=>({key,value}))})!;
 expect(parse({carousel_autoplay:'false',carousel_interval:'5000',display_mode:'image'})).toMatchObject({carouselAutoplay:false,carouselInterval:5000,displayMode:'image'});
 expect(parse({carousel_interval:'1'}).carouselInterval).toBe(2000);
 expect(parse({carousel_interval:'90000'}).carouselInterval).toBe(20000);
 expect(parse({carousel_interval:'NaN',carousel_autoplay:'yes',display_mode:'html'})).toMatchObject({carouselInterval:undefined,carouselAutoplay:undefined,displayMode:undefined});
});

test('editor URLs cannot inject protocols, credentials, controls, or unsupported images',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,test','//example.com','/\\example.com','https://user:password@example.com','https://example.com\n/path','mailto:a@b.com','http://example.com','/%0aevil'])expect(safeLink(url),url).toBeUndefined();
 expect(safeLink('/shop?type=Hair%20Care#products')).toBe('/shop?type=Hair%20Care#products');
 expect(safeLink('https://example.com/guide')).toBe('https://example.com/guide');
 expect(safeLink('mailto:hello@example.com',true)).toBe('mailto:hello@example.com');
 expect(safeImage('https://cdn.shopify.com/s/files/hero.jpg')).toBe('https://cdn.shopify.com/s/files/hero.jpg');
 for(const url of ['https://cdn.shopify.com.attacker.com/photo.jpg','https://example.com/photo.jpg','/images/../secret','/api/private','javascript:x'])expect(safeImage(url),url).toBeUndefined();
 expect(safeImage('/images/hero.jpg')).toBe('/images/hero.jpg');
});

test('rich text becomes readable plain text and large content is bounded',()=>{
 const rich=JSON.stringify({type:'root',children:[{type:'paragraph',children:[{type:'text',value:'Made '},{type:'text',value:'by hand.'}]},{type:'paragraph',children:[{type:'text',value:'With care.'}]}]});
 expect(plainText(rich)).toBe('Made by hand.\nWith care.');
 expect(plainText('<p>Hello <strong>there</strong></p><script>alert(1)</script>')).toBe('Hello there');
 expect(plainText('a'.repeat(200),80)).toHaveLength(80);
 expect(textList(JSON.stringify(['one',null,{key:'bad'},'two']))).toEqual(['one','two']);
 expect(textList(Array(100).fill('long'),5,2)).toEqual(Array(5).fill('lo'));
});

test('section mapping preserves editor intent while rejecting invalid optional settings',()=>{
 const content=normalizeContentSection({handle:'home-hero',fields:[{key:'title',value:'New hero'},{key:'enabled',value:'false'},{key:'sort_order',value:'12'},{key:'image_position',value:'url(unsafe)'},{key:'image',reference:{image:{url:'https://cdn.shopify.com/hero.jpg',altText:'The atelier'}}},{key:'link_url',value:'javascript:bad'},{key:'products',references:{nodes:[{__typename:'Product',handle:'rose-soap'},{__typename:'Product',handle:'rose-soap'},{__typename:'Collection',handle:'body'},{__typename:'Product',handle:'<invalid>'}]}}]});
 expect(content).toMatchObject({handle:'home-hero',title:'New hero',enabled:false,sortOrder:12,image:'https://cdn.shopify.com/hero.jpg',imageAlt:'The atelier',productHandles:['rose-soap']});
 expect(content?.linkUrl).toBeUndefined();expect(content?.imagePosition).toBeUndefined();
 expect(normalizeContentSection({handle:'__proto__',fields:[]})).toBeNull();
});

test('usable dyu content wins, while empty new fields preserve legacy custom data',()=>{
 const fields:ProductMetafield[]=[{namespace:'custom',key:'short_story',type:'multi_line_text_field',value:'Original story'},{namespace:'dyu',key:'short_story',type:'rich_text_field',value:JSON.stringify({type:'root',children:[]})}];
 expect(productText(fields,'short_story')).toBe('Original story');
 fields[1].value='Updated story';expect(productText(fields,'short_story')).toBe('Updated story');
 const ingredients:ProductMetafield[]=[{namespace:'dyu',key:'ingredients',type:'list.metaobject_reference',value:'["gid://shopify/Metaobject/123"]',references:{nodes:[]}},{namespace:'custom',key:'ingredients',type:'json',value:JSON.stringify([{name:'Rose',description:'Original ingredient notes',image:'javascript:bad'}])}];
 expect(productStoryItems(ingredients,'ingredients')).toEqual([{name:'Rose',description:'Original ingredient notes',image:undefined,handle:undefined,title:undefined}]);
 expect(productStoryItems(ingredients.slice(0,1),'ingredients')).toEqual([]);
});

test('product references and presentation controls stay within supported shapes and colors',()=>{
 const fields:ProductMetafield[]=[{namespace:'dyu',key:'display_shape',type:'single_line_text_field',value:'unknown'},{namespace:'custom',key:'display_shape',type:'single_line_text_field',value:'bottle'},{namespace:'dyu',key:'tone',type:'color',value:'red;background:url(javascript:bad)'},{namespace:'custom',key:'tone',type:'color',value:'#123abc'},{namespace:'dyu',key:'related_products',type:'list.product_reference',value:'[]',references:{nodes:[{__typename:'Product',handle:'rose-soap'},{__typename:'Product',handle:'rose-soap'},{__typename:'Metaobject',handle:'ingredient'}]}}];
 expect(productPresentation(fields)).toEqual({shape:'bottle',tone:'#123abc',relatedProductHandles:['rose-soap']});
});
