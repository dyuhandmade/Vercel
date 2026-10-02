import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, dirname, basename, join} from 'node:path';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const temporaryRoot=resolve(tmpdir()),temporary=mkdtempSync(join(temporaryRoot,'dyu-catalog-audit-'));
let photo,objects;
try {
 execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--ignoreConfig','src/lib/photo-model.ts','--target','ES2020','--module','CommonJS','--lib','ES2020,DOM','--skipLibCheck','--outDir',temporary]);
 photo=require(join(temporary,'photo-model.js'));
 objects=require(join(temporary,'photo-objects.js'));
}finally{
 if(dirname(resolve(temporary))!==temporaryRoot||!basename(temporary).startsWith('dyu-catalog-audit-'))throw Error('Invalid audit temp path');
 rmSync(temporary,{recursive:true,force:true});
}
const catalog=JSON.parse(readFileSync('qa/audit-catalog/catalog.json'));
const cases={
 'damask-rose-cold-processed-soap':'carton and rectangular soap with petals',
 'lavendar-haze-soap-bar-60-gm':'carton and pale hexagonal soap with lavender sprigs',
 'rose-reset-cold-process-soap':'carton and embossed hexagonal soap with loose petals',
 'tea-tree-trip-soap-bar':'carton and embossed hexagonal soap with herb sprig',
 'floral-soap-gift-set':'promotional caption and three angled cartons',
 'wellness-trio-soap-bundle':'promotional caption and three angled cartons',
 'triple-body-butter-rose':'isolated shallow metal tin photographed from above',
 'triple-body-butter-lavendar':'open tin held in two hands on coloured background',
 'triple-body-butter-sandalwood':'open tin held in two hands with promotional text',
 'facial-ubtan-orange-almond':'clear round diamond-pattern glass jar, metal lid, top label',
 'body-ubtan-tea-tree':'clear round diamond-pattern glass jar, metal lid, top label',
 'facial-ubtan-orange-almond-1':'same glass jar with foreground fruit, nuts and flower',
 'body-ubtan-tea-tree-1':'same glass jar with foreground grains and herbs',
 'mud-face-wash':'same glass jar with foreground bowls and ingredients',
 'moringa-facial-oil':'isolated tall amber dropper bottle',
 'almond-facial-oil':'isolated tall amber dropper bottle',
 'rosemary-olive-hair-oil':'flat rectangular oil bottle with herbs to right',
 'cold-pressed-sweet-almond-oil':'flat rectangular oil bottle with almonds to right',
};
const report=[];
for (const item of catalog){
 const {data,info}=await sharp(item.file).resize(192,192,{fit:'inside'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const pixels={width:info.width,height:info.height,data:new Uint8ClampedArray(data)},analysis=photo.analysePhotoPixels(pixels);
 const hint=item.path.endsWith('/mud-face-wash')?'general':item.shape;
 const parts=objects.inferPhotoObjects(pixels,analysis,hint);
 const b=analysis.bounds;
 report.push({handle:item.path.split('/').at(-1),case:cases[item.path.split('/').at(-1)]||'isolated printed rectangular carton',hint,mode:parts.length?'solids':analysis.kind,confidence:+analysis.confidence.toFixed(3),bounds:b,frameFraction:+(b.width*b.height/(info.width*info.height)).toFixed(3),parts:parts.map(p=>({kind:p.kind,bounds:p.bounds,contourPoints:p.contour?.length||0}))});
}
writeFileSync('qa/audit-catalog/report.json',JSON.stringify(report,null,2));
console.log(report.map(p=>`${p.handle}: ${p.mode} ${p.parts.map(o=>o.kind+(o.contourPoints?'('+o.contourPoints+' contour)':'')).join('+')}`).join('\n'));
