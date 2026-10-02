import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const temporaryRoot=resolve(tmpdir()),temporary=mkdtempSync(join(temporaryRoot,'dyu-held-container-'));
let inferHeldContainer;
try{
 const compiler=join(dirname(require.resolve('typescript/package.json')),'bin','tsc');
 execFileSync(process.execPath,[compiler,'--ignoreConfig',join(root,'src/lib/photo-held-container.ts'),'--target','ES2020','--module','ESNext','--lib','ES2020,DOM','--skipLibCheck','--outDir',temporary],{stdio:['ignore','pipe','pipe']});
 const javascript=readFileSync(join(temporary,'photo-held-container.js'),'utf8');
 ({inferHeldContainer}=await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`));
}finally{
 assert.equal(dirname(resolve(temporary)),temporaryRoot);assert.ok(basename(temporary).startsWith('dyu-held-container-'));
 rmSync(temporary,{recursive:true,force:true});
}
async function photo(name,size=192){
 const {data,info}=await sharp(join(root,'qa/fixtures',name)).resize(size,size,{fit:'inside'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 return {width:info.width,height:info.height,data:new Uint8ClampedArray(data)};
}
let checks=0;
for(const name of ['held-cream-tin-warm.png','held-cream-tin-neutral.png','held-cream-tin-caption.png']){
 const source=await photo(name),start=performance.now(),tin=inferHeldContainer(source);
 console.log(name,tin&&{bounds:tin.bounds,color:tin.color,confidence:tin.confidence},Math.round(performance.now()-start)+'ms');
 assert.ok(tin,`${name}: the actual visible metal rim should be recognised`);
 assert.equal(tin.kind,'jar');assert.ok(tin.contour.length>=32);
 // Hand-verified visible rim, normalised to the original 640-square photograph.
 const b=tin.bounds;
 assert.ok(b.x>=62&&b.x<=72&&b.y>=57&&b.y<=67,`${name}: crop misses the upper-left metal rim`);
 assert.ok(b.x+b.width>=117&&b.x+b.width<=127&&b.y+b.height>=113&&b.y+b.height<=123,`${name}: crop includes hand or clips the lower-right rim`);
 assert.ok(b.width<source.width*.34&&b.height<source.height*.36,'hands must not become the product geometry');
 assert.ok(Math.max(...tin.color)-Math.min(...tin.color)<.10,'inferred reverse must use metal, not skin/cream');
 checks++;
}
for(const name of ['body-ubtan-photo.png','rose-tin-photo.png','damask-photo.png','camphora-photo.png','oriental-lavendar-photo.png','floral-soap-gift-set.png','wellness-trio-soap-bundle.png','rosemary-olive-hair-oil.png']){
 assert.equal(inferHeldContainer(await photo(name)),undefined,`${name}: unrelated photo must not be treated as a held open tin`);checks++;
}
const synthetic=(paint)=>{const width=192,height=192,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set([...paint(x,y),255],(y*width+x)*4);return {width,height,data};};
assert.equal(inferHeldContainer(synthetic((x,y)=>(x-96)**2+(y-96)**2<28**2?[248,240,215]:[157,113,90])),undefined,'a cream-coloured circle without metal rim is insufficient evidence');checks++;
assert.equal(inferHeldContainer(synthetic(()=>[230,230,230])),undefined,'uniform background is not a container');checks++;
console.log(`Passed ${checks} held-container checks.`);
