import * as THREE from 'three';
import type {PhotoMask} from './photo-model';
import type {PhotoObject} from './photo-objects';
import type {VesselPhotoProfile} from './photo-materials';
import {layoutPhotoObjects} from './photo-solid-geometry';

export type VesselSurface='body'|'lid'|'top'|'bottom';

/** Estimate the ellipse from the upper silhouette, rather than revolving the photographed lid. */
export function jarEllipseRatio(object:PhotoObject,analysis:PhotoMask){
 const {bounds:b}=object,candidates:number[]=[];
 const center=b.x+(b.width-1)/2;
 for(let y=b.y+1;y<b.y+b.height*.32;y++){
  let left=b.x+b.width,right=b.x-1;
  for(let x=b.x;x<b.x+b.width;x++)if(analysis.mask[y*analysis.width+x]){left=Math.min(left,x);right=Math.max(right,x);}
  // An adjacent leaf can be joined to the lid by the filled silhouette mask.
  // A circular lid is symmetric: use the shorter radius about the already
  // inferred vessel center, so that one-sided props cannot widen its arc.
  const r=2*Math.min(center-left+.5,right-center+.5)/b.width;
  if(r>.3&&r<.93)candidates.push(2*(y-b.y)/(1-Math.sqrt(1-r*r))/b.height);
 }
 candidates.sort((a,b)=>a-b);
 const estimate=candidates[Math.floor(candidates.length/2)]??Math.min(.65,b.width/b.height*.45);
 return THREE.MathUtils.clamp(estimate,.24,Math.min(.72,b.width/b.height*.64));
}

/** Complete cylindrical jar with separate circular lid, wall and base. UVs wrap continuously. */
export function createPhotoVessel(object:PhotoObject,analysis:PhotoMask,layout:ReturnType<typeof layoutPhotoObjects>){
 const width=object.bounds.width*layout.scale,height=object.bounds.height*layout.scale;
 const ellipse=jarEllipseRatio(object,analysis);
 const tilt=Math.asin(THREE.MathUtils.clamp(ellipse*height/width,.18,.64));
 const depthShift=width*Math.sin(tilt)/(2*height);
 const radius=width/2,fullHeight=(height-width*Math.sin(tilt))/Math.cos(tilt);
 const lidHeight=Math.min(fullHeight*.3,width*.13),bodyHeight=fullHeight-lidHeight;
 const widths:number[]=[];
 for(let sy=Math.round(object.bounds.y+object.bounds.height*.66);sy<object.bounds.y+object.bounds.height*.84;sy++){
  let first=object.bounds.x+object.bounds.width,last=object.bounds.x-1;
  for(let sx=object.bounds.x;sx<object.bounds.x+object.bounds.width;sx++)if(analysis.mask[sy*analysis.width+sx]){first=Math.min(first,sx);last=Math.max(last,sx);}
  if(last>=first)widths.push((last-first+1)/object.bounds.width);
 }
 widths.sort((a,b)=>a-b);
 const bodyRatio=THREE.MathUtils.clamp(widths[Math.floor(widths.length/2)]??.92,.78,.97);
 const bottomY=-fullHeight/2,joinY=fullHeight/2-lidHeight,topY=fullHeight/2;
 const profile:VesselPhotoProfile={
  lidTop:depthShift,lidBottom:depthShift+lidHeight*Math.cos(tilt)/height,
  bodyTop:depthShift+lidHeight*Math.cos(tilt)/height,bodyBottom:1-depthShift,
  depthShift,bodyRadiusRatio:bodyRatio,lidEllipse:{x:0,y:0,width:1,height:depthShift*2},
 };
 const parts:{geometry:THREE.BufferGeometry;surface:VesselSurface}[]=[];
 const wall=(surface:VesselSurface,points:THREE.Vector2[],low:number,high:number)=>{
  // Starting at the back keeps the texture seam away from the product's front.
  const geometry=new THREE.LatheGeometry(points,96,Math.PI,Math.PI*2);
  const uv=geometry.getAttribute('uv'),position=geometry.getAttribute('position');
  for(let i=0;i<uv.count;i++)uv.setY(i,THREE.MathUtils.clamp((position.getY(i)-low)/(high-low),0,1));
  geometry.rotateX(tilt);parts.push({geometry,surface});
 };
 wall('body',[
  new THREE.Vector2(radius*(bodyRatio-.04),bottomY),new THREE.Vector2(radius*(bodyRatio-.01),bottomY+bodyHeight*.035),
  new THREE.Vector2(radius*bodyRatio,bottomY+bodyHeight*.1),new THREE.Vector2(radius*bodyRatio,joinY),
 ],bottomY,joinY);
 wall('lid',[
  new THREE.Vector2(radius*bodyRatio,joinY),new THREE.Vector2(radius*.99,joinY+lidHeight*.10),
  new THREE.Vector2(radius,joinY+lidHeight*.25),new THREE.Vector2(radius,topY-lidHeight*.2),
  new THREE.Vector2(radius*.96,topY),
 ],joinY,topY);
 for(const surface of ['top','bottom'] as const){
  const top=surface==='top',r=radius*(top?.96:bodyRatio-.04),y=top?topY:bottomY;
  const geometry=new THREE.CircleGeometry(r,96);
  const position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  // Circle local Y becomes -Z on the lid. Source photo top/back maps to texture V=1.
  for(let i=0;i<uv.count;i++)uv.setXY(i,position.getX(i)/(radius*2)+.5,position.getY(i)/(radius*2)+.5);
  geometry.rotateX(top?-Math.PI/2:Math.PI/2);geometry.translate(0,y,0);geometry.rotateX(tilt);
  parts.push({geometry,surface});
 }
 const x=(object.bounds.x+object.bounds.width/2-(layout.left+layout.right)/2)*layout.scale;
 const y=((layout.top+layout.bottom)/2-object.bounds.y-object.bounds.height/2)*layout.scale;
 return {parts,profile,position:[x,y,0] as [number,number,number],depth:width*Math.cos(tilt)+fullHeight*Math.sin(tilt)};
}
