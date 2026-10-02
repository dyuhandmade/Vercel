import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve('qa/model-source-candidates');await fs.mkdir(root,{recursive:true});
const handles=['triple-body-butter-lavendar','triple-body-butter-sandalwood','mud-face-wash','body-ubtan-tea-tree-1','facial-ubtan-orange-almond-1'];
const products=JSON.parse(await fs.readFile('qa/catalog-model-audit/report.json','utf8'));
const records=[];
for(const handle of handles){
 const product=products.find(p=>p.handle===handle);
 const urls=[...new Set(product.images.map(i=>new URL(i.src).searchParams.get('url')||i.src))];
 const record={handle,images:[]};
 for(let index=0;index<urls.length;index++){
  const url=urls[index],proxy=`http://127.0.0.1:3000/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`;
  const response=await fetch(proxy);if(!response.ok)throw new Error(`${response.status}: ${handle} ${index+1}`);
  const bytes=Buffer.from(await response.arrayBuffer()),file=path.join(root,`${handle}-${index+1}.png`);
  await sharp(bytes).png().toFile(file);
  record.images.push({index:index+1,url,proxy,file});
 }
 const cols=Math.min(3,urls.length),w=400,h=430,rows=Math.ceil(urls.length/cols),composite=[];
 for(let i=0;i<record.images.length;i++){
  const item=record.images[i],left=i%cols*w,top=Math.floor(i/cols)*h;
  composite.push({input:await sharp(item.file).resize(w,h-30,{fit:'contain',background:'white'}).png().toBuffer(),left,top});
  composite.push({input:Buffer.from(`<svg width="400" height="30"><rect width="400" height="30" fill="white"/><text x="5" y="21" font-size="13" font-family="Arial">${item.index}. ${handle}</text></svg>`),left,top:top+h-30});
 }
 record.sheet=path.join(root,`${handle}-contact.png`);
 await sharp({create:{width:cols*w,height:rows*h,channels:4,background:'white'}}).composite(composite).png().toFile(record.sheet);
 records.push(record);console.log(`${handle}: ${urls.length} images saved`);
}
await fs.writeFile(path.join(root,'sources.json'),JSON.stringify(records,null,2));
