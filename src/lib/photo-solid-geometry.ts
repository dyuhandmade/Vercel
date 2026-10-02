import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {PhotoMask} from './photo-model';
import type {PhotoObject} from './photo-objects';

export function layoutPhotoObjects(objects:PhotoObject[]) {
 const left=Math.min(...objects.map(o=>o.bounds.x)),top=Math.min(...objects.map(o=>o.bounds.y));
 const right=Math.max(...objects.map(o=>o.bounds.x+o.bounds.width)),bottom=Math.max(...objects.map(o=>o.bounds.y+o.bounds.height));
 const scale=2/Math.max(right-left,bottom-top);
 return {left,top,right,bottom,scale,width:(right-left)*scale,height:(bottom-top)*scale};
}

/** Use the visible outline as a radius profile, with a full circular reverse. */
function vesselGeometry(object:PhotoObject,analysis:PhotoMask,width:number,height:number) {
 const {bounds}=object;
 const shallowTin=object.kind==='jar'&&width/height>1.3;
 const rings=56;
 const radii:number[]=[];
 for(let i=0;i<=rings;i++){
  const sy=Math.max(0,Math.min(analysis.height-1,Math.round(bounds.y+(1-i/rings)*(bounds.height-1))));
  let first=bounds.x+bounds.width,last=bounds.x;
  for(let x=Math.ceil(bounds.x);x<bounds.x+bounds.width;x++)if(analysis.mask[sy*analysis.width+x]){first=Math.min(first,x);last=Math.max(last,x);}
  radii.push(Math.max(width*.035,Math.min(width*.5,(last-first+1)/bounds.width*width*.5)));
 }
 const smooth=radii.map((r,i)=>(r+(radii[Math.max(0,i-1)]||r)+(radii[Math.min(rings,i+1)]||r))/3);
 let points=[new THREE.Vector2(0,-height/2),...smooth.map((radius,i)=>new THREE.Vector2(radius,(i/rings-.5)*height)),new THREE.Vector2(0,height/2)];
 // A wide tin photographed from above includes the lid ellipse in its image height.
 // Revolving those image rows makes a bowl. Infer a shallow cylindrical body instead,
 // tilt it to the photographed view, and project the original artwork onto the visible lid.
 const tilt=.44;
 if(shallowTin){
  const radius=width/2,bodyHeight=Math.max(width*.16,(height-width*Math.sin(tilt))/Math.cos(tilt));
  const profile:[[number,number],...[number,number][]]=[[0,-.5],[.91,-.5],[.955,-.46],[.97,-.36],[.97,.20],[.995,.23],[1,.34],[.995,.45],[.96,.5],[0,.5]];
  points=profile.map(([r,y])=>new THREE.Vector2(r*radius,y*bodyHeight));
 }
 const lathe=new THREE.LatheGeometry(points,80);
 // A jar seen from above does not establish its true diameter in depth.
 const depthRatio=shallowTin?1:object.kind==='jar'?.78:1;
 lathe.scale(1,1,depthRatio);
 if(shallowTin)lathe.rotateX(tilt);
 const flat=lathe.toNonIndexed();lathe.dispose();
 const p=flat.getAttribute('position'),n=flat.getAttribute('normal');
 const front:number[]=[],reverse:number[]=[],frontNormals:number[]=[],reverseNormals:number[]=[],frontUV:number[]=[],reverseUV:number[]=[];
 for(let i=0;i<p.count;i+=3){
  const isFront=shallowTin?(n.getZ(i)+n.getZ(i+1)+n.getZ(i+2))>0:(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))>0;
  for(let j=i;j<i+3;j++){
   const x=p.getX(j),y=p.getY(j),z=p.getZ(j);
   (isFront?front:reverse).push(x,y,z);
   (isFront?frontNormals:reverseNormals).push(n.getX(j),n.getY(j),n.getZ(j));
   // The real artwork is projected only onto the visible half; reverse UVs follow the surface.
   (isFront?frontUV:reverseUV).push(isFront?THREE.MathUtils.clamp(x/width+.5,0,1):(Math.atan2(x,z/depthRatio)+Math.PI)/(2*Math.PI),THREE.MathUtils.clamp(y/height+.5,0,1));
  }
 }
 flat.dispose();
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([...front,...reverse],3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute([...frontNormals,...reverseNormals],3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute([...frontUV,...reverseUV],2));
 geometry.addGroup(0,front.length/3,0);geometry.addGroup(front.length/3,reverse.length/3,1);
 return {geometry,depth:width*depthRatio,materialOrder:['front','back'] as const};
}

/** The held-tin detector supplies a dense ellipse, rather than a faceted package outline. */
function isCurvedTin(object:PhotoObject) {
 const points=object.contour;
 if(object.kind!=='jar'||!points||points.length<48)return false;
 const cx=points.reduce((sum,point)=>sum+point.x,0)/points.length,cy=points.reduce((sum,point)=>sum+point.y,0)/points.length;
 const rx=(Math.max(...points.map(point=>point.x))-Math.min(...points.map(point=>point.x)))/2;
 const ry=(Math.max(...points.map(point=>point.y))-Math.min(...points.map(point=>point.y)))/2;
 return rx>0&&ry>0&&points.every(point=>Math.abs(((point.x-cx)/rx)**2+((point.y-cy)/ry)**2-1)<.06);
}

/** Smooth welded wall vertices only; cap/material boundaries retain their own normals and UVs. */
function smoothTinWalls(geometry:THREE.BufferGeometry) {
 const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
 const sums=new Map<string,THREE.Vector3>(),key=(i:number)=>[position.getX(i),position.getY(i),position.getZ(i)].map(value=>Math.round(value*1e6)).join(',');
 const at=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),face=new THREE.Vector3();
 const walls=geometry.groups.filter(group=>group.materialIndex===2);
 for(const group of walls)for(let i=group.start;i<group.start+group.count;i+=3)for(let corner=0;corner<3;corner++){
  const vertex=i+corner;
  at.fromBufferAttribute(position,vertex);
  a.fromBufferAttribute(position,i+(corner+1)%3).sub(at).normalize();
  b.fromBufferAttribute(position,i+(corner+2)%3).sub(at).normalize();
  const angle=Math.acos(THREE.MathUtils.clamp(a.dot(b),-1,1)),id=key(vertex);
  const sum=sums.get(id)??new THREE.Vector3();
  // Corner weighting makes the result independent of each quad's diagonal triangulation.
  sum.addScaledVector(face.fromBufferAttribute(normal,vertex),angle);sums.set(id,sum);
 }
 for(const sum of sums.values())sum.normalize();
 for(const group of walls)for(let i=group.start;i<group.start+group.count;i++){
  const value=sums.get(key(i))!;normal.setXYZ(i,value.x,value.y,value.z);
 }
 normal.needsUpdate=true;
}

/** Separate cartons and bars get actual planar faces, independent thickness and softened edges. */
export function createPhotoSolid(object:PhotoObject,analysis:PhotoMask,layout:ReturnType<typeof layoutPhotoObjects>) {
 const width=object.bounds.width*layout.scale,height=object.bounds.height*layout.scale;
 const x=(object.bounds.x+object.bounds.width/2-(layout.left+layout.right)/2)*layout.scale;
 const y=((layout.top+layout.bottom)/2-object.bounds.y-object.bounds.height/2)*layout.scale;
 if(!object.contour&&(object.kind==='bottle'||object.kind==='jar'))return {...vesselGeometry(object,analysis,width,height),position:[x,y,0] as [number,number,number]};
 const depth=Math.min(width*(object.kind==='box'?.31:.34),height*.30);
 const radius=Math.min(width,height,depth)*(object.kind==='box'?.035:.13);
 if(object.contour?.length){
  const shape=new THREE.Shape();
  object.contour.forEach((point,i)=>{
   const px=(point.x-object.bounds.x-object.bounds.width/2)*layout.scale;
   const py=(object.bounds.y+object.bounds.height/2-point.y)*layout.scale;
   if(i===0)shape.moveTo(px,py);else shape.lineTo(px,py);
  });
  shape.closePath();
  const bevel=Math.min(width,height)*.009;
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:depth-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,steps:1});
  geometry.translate(0,0,-depth/2+bevel);geometry.clearGroups();
  const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
  for(let i=0;i<position.count;i+=3){
   const nz=(normal.getZ(i)+normal.getZ(i+1)+normal.getZ(i+2))/3;
   const material=nz>.5?0:nz<-.5?1:2;
   const previous=geometry.groups[geometry.groups.length-1];
   if(previous?.materialIndex===material)previous.count+=3;else geometry.addGroup(i,3,material);
   for(let j=i;j<i+3;j++)uv.setXY(j,THREE.MathUtils.clamp(position.getX(j)/width+.5,0,1),THREE.MathUtils.clamp(position.getY(j)/height+.5,0,1));
  }
  if(isCurvedTin(object))smoothTinWalls(geometry);
  return {geometry,depth,position:[x,y,object.kind==='soap'?.035:0] as [number,number,number],materialOrder:['front','back','side'] as const};
 }
 const geometry=new RoundedBoxGeometry(width,height,depth,4,radius);
 return {geometry,depth,position:[x,y,object.kind==='soap'?.035:0] as [number,number,number],materialOrder:['side','side','side','side','front','back'] as const};
}
