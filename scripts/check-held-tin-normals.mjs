import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const temporaryRoot=resolve(tmpdir()),temporary=mkdtempSync(join(temporaryRoot,'dyu-tin-normals-'));
let createPhotoSolid,layoutPhotoObjects;
try{
 const compiler=join(dirname(require.resolve('typescript/package.json')),'bin','tsc');
 execFileSync(process.execPath,[compiler,'--ignoreConfig',join(root,'src/lib/photo-solid-geometry.ts'),'--target','ES2020','--module','ESNext','--lib','ES2020,DOM','--skipLibCheck','--outDir',temporary],{stdio:['ignore','pipe','pipe']});
 writeFileSync(join(temporary,'package.json'),'{"type":"module"}');
 for(const file of readdirSync(temporary).filter(name=>name.endsWith('.js'))){
  const source=readFileSync(join(temporary,file),'utf8').replace(/from\s*(['"])([^'"]+)\1/g,(statement,quote,specifier)=>{
   if(specifier.startsWith('./'))return `from ${quote}${specifier}.js${quote}`;
   if(specifier==='three')return `from ${quote}${pathToFileURL(join(dirname(require.resolve('three')),'three.module.js')).href}${quote}`;
   if(specifier.startsWith('three/'))return `from ${quote}${pathToFileURL(require.resolve(specifier)).href}${quote}`;
   return statement;
  });writeFileSync(join(temporary,file),source);
 }
 ({createPhotoSolid,layoutPhotoObjects}=await import(pathToFileURL(join(temporary,'photo-solid-geometry.js')).href));
}finally{
 assert.equal(dirname(resolve(temporary)),temporaryRoot);assert.ok(basename(temporary).startsWith('dyu-tin-normals-'));
 rmSync(temporary,{recursive:true,force:true});
}
const analysis={width:192,height:192,mask:new Uint8Array(192*192).fill(1),bounds:{x:0,y:0,width:192,height:192},kind:'volume',confidence:1,color:[.8,.8,.8]};
const ellipse={kind:'jar',bounds:{x:60,y:60,width:60,height:54},color:[.8,.8,.8],confidence:.9,contour:Array.from({length:64},(_,i)=>({x:90+30*Math.cos(i*Math.PI/32),y:87+27*Math.sin(i*Math.PI/32)}))};
const make=object=>createPhotoSolid(object,analysis,layoutPhotoObjects([object])).geometry;
const smooth=make(ellipse),faceted=make({...ellipse,kind:'soap'});
assert.deepEqual(smooth.getAttribute('position').array,faceted.getAttribute('position').array,'smoothing must not change silhouette or thickness');
assert.deepEqual(smooth.getAttribute('uv').array,faceted.getAttribute('uv').array,'real artwork UVs must remain intact');
assert.deepEqual(smooth.groups,faceted.groups,'cap and side material boundaries must remain intact');
let duplicates=0,originalSeams=0,capVertices=0;
const seen=new Map(),p=smooth.getAttribute('position'),n=smooth.getAttribute('normal'),old=faceted.getAttribute('normal');
for(const group of smooth.groups)for(let i=group.start;i<group.start+group.count;i++){
 const normal=[n.getX(i),n.getY(i),n.getZ(i)];
 assert.ok(normal.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...normal)-1)<1e-5);
 if(group.materialIndex!==2){
  assert.deepEqual(normal,[old.getX(i),old.getY(i),old.getZ(i)],'front/back cap normals must remain unchanged');capVertices++;continue;
 }
 const key=[p.getX(i),p.getY(i),p.getZ(i)].map(value=>Math.round(value*1e6)).join(',');
 const previous=seen.get(key);
 if(previous!==undefined){
  duplicates++;
  assert.ok(Math.hypot(n.getX(previous)-normal[0],n.getY(previous)-normal[1],n.getZ(previous)-normal[2])<1e-6,'shared curved-wall vertices must not create specular seams');
  if(Math.hypot(old.getX(previous)-old.getX(i),old.getY(previous)-old.getY(i),old.getZ(previous)-old.getZ(i))>.01)originalSeams++;
 }else seen.set(key,i);
}
assert.ok(duplicates>100&&originalSeams>50&&capVertices>100,'fixture must exercise the old facets plus untouched caps');
const polygon={...ellipse,contour:Array.from({length:6},(_,i)=>({x:90+30*Math.cos(i*Math.PI/3),y:87+27*Math.sin(i*Math.PI/3)}))};
const polygonJar=make(polygon),polygonSoap=make({...polygon,kind:'soap'});
assert.deepEqual(polygonJar.getAttribute('normal').array,polygonSoap.getAttribute('normal').array,'polygonal product edges must retain their intentional facets');
for(const geometry of [smooth,faceted,polygonJar,polygonSoap])geometry.dispose();
console.log(`PASS held-tin wall normals: ${duplicates} welded vertices have continuous normals; ${originalSeams} former facet seams removed; ${capVertices} cap vertices and polygonal products preserved.`);
