'use client';

import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import PhotoProductModel from './PhotoProductModel';
import type {HeroProduct} from '@/lib/hero-scene';
import type {PhotoModelMetadata} from '@/lib/photo-model';

type Props={
 members:HeroProduct[];
 onMetadata:(metadata:PhotoModelMetadata)=>void;
 onReady:()=>void;
 onUnavailable:()=>void;
};
type Source={product:HeroProduct;image:string};
type Triplet=[number,number,number];
type Placement={offset:Triplet;position:Triplet;angle:number;scale:number};
type Layout={placements:Placement[];offset:Triplet;scale:number};

/** Measure in the member's own space, independent of the enclosing hero's scale and position. */
function memberBounds(root:THREE.Group){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert();
 const bounds=new THREE.Box3();
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh)||!object.geometry)return;
  const geometry=object.geometry as THREE.BufferGeometry;
  if(!geometry.boundingBox)geometry.computeBoundingBox();
  if(!geometry.boundingBox)return;
  const relative=new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld);
  bounds.union(geometry.boundingBox.clone().applyMatrix4(relative));
 });
 return bounds;
}

function BundleScene({sources,onMetadata,onReady,onUnavailable}:Omit<Props,'members'>&{sources:Source[]}){
 // The outer source key remounts this component when any member photograph changes.
 const products=useRef(sources).current;
 const groups=useRef<(THREE.Group|null)[]>([]);
 const information=useRef<(PhotoModelMetadata|undefined)[]>([]);
 const loadedMembers=useRef<boolean[]>([]);
 const rejected=useRef(false),reported=useRef(false),scheduled=useRef<number|undefined>(undefined);
 const [revision,setRevision]=useState(0),[layout,setLayout]=useState<Layout>();
 const {invalidate}=useThree();
 const callbacks=useRef({onMetadata,onReady,onUnavailable});callbacks.current={onMetadata,onReady,onUnavailable};
 const unavailable=useCallback(()=>{
  if(rejected.current)return;
  rejected.current=true;callbacks.current.onUnavailable();
 },[]);
 const record=useCallback((index:number,metadata:PhotoModelMetadata)=>{
  // A bundle must contain its actual products, never a marketing graphic on a rectangular relief.
  if(metadata.kind!=='volume'||metadata.construction!=='solids'){unavailable();return;}
  information.current[index]=metadata;setRevision(value=>value+1);
 },[unavailable]);
 const loaded=useCallback((index:number)=>{
  loadedMembers.current[index]=true;setRevision(value=>value+1);
 },[]);
 useEffect(()=>{
  if(!products.length||products.some(member=>!member.image))unavailable();
  return()=>{if(scheduled.current!==undefined)cancelAnimationFrame(scheduled.current);};
 },[products,unavailable]);

 useLayoutEffect(()=>{
  if(rejected.current||layout||!products.length||products.some((_,index)=>!loadedMembers.current[index]||!information.current[index]||!groups.current[index]))return;
  const combined=new THREE.Box3();
  const measured=products.map((_,index)=>{
   const bounds=memberBounds(groups.current[index]!);
   const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
   if(bounds.isEmpty()||![size.x,size.y,size.z].every(value=>Number.isFinite(value)&&value>.001))return null;
   const scale=1.6/size.y;
   const angle=(index-(products.length-1)/2)*-.065;
   const offset:Triplet=[-center.x,-bounds.min.y,-center.z];
   const transform=new THREE.Matrix4().compose(new THREE.Vector3(),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),new THREE.Vector3(scale,scale,scale));
   const rotated=bounds.clone().translate(new THREE.Vector3(...offset)).applyMatrix4(transform);
   return {offset,angle,scale,bounds:rotated};
  });
  if(measured.some(member=>!member)){unavailable();return;}
  const gap=.13;
  const totalWidth=measured.reduce((sum,member)=>sum+member!.bounds.max.x-member!.bounds.min.x,0)+gap*(products.length-1);
  let cursor=-totalWidth/2;
  const placements=measured.map((member,index)=>{
   const {bounds,offset,angle,scale}=member!;
   const position:Triplet=[cursor-bounds.min.x,0,[0,-.12,.03][index]];
   combined.union(bounds.clone().translate(new THREE.Vector3(...position)));
   cursor+=bounds.max.x-bounds.min.x+gap;
   return {offset,angle,scale,position};
  });
  const center=combined.getCenter(new THREE.Vector3()),size=combined.getSize(new THREE.Vector3());
  const normalization=2/Math.max(size.x,size.y,size.z);
  setLayout({placements,offset:[-center.x,-center.y,-center.z],scale:normalization});
  const details=products.map((_,index)=>information.current[index]!);
  callbacks.current.onMetadata({
   kind:'volume',construction:'solids',width:size.x*normalization,height:size.y*normalization,depth:size.z*normalization,
   confidence:Math.min(...details.map(metadata=>metadata.confidence)),
   parts:details.reduce((sum,metadata)=>sum+(metadata.parts||1),0),partKinds:details.flatMap(metadata=>metadata.partKinds||[]),
  });
  invalidate();
 },[revision,layout,products,invalidate,unavailable]);

 useFrame(()=>{
  if(!layout||reported.current||rejected.current)return;
  reported.current=true;
  scheduled.current=requestAnimationFrame(()=>{if(!rejected.current)callbacks.current.onReady();});
 });

 return <group scale={layout?.scale??1} name="authentic-bundle-model">
  <group position={layout?.offset??[0,0,0]}>
   {products.map(({product,image},index)=>{
    const placement=layout?.placements[index];
    return <group key={`${product.id}-${image}`} position={placement?.position??[0,0,0]} rotation={[0,placement?.angle??0,0]} scale={placement?.scale??1}>
     <group position={placement?.offset??[0,0,0]}>
      <group ref={group=>{groups.current[index]=group;}}>
       {image&&<PhotoProductModel image={image} shape={product.shape} onMetadata={metadata=>record(index,metadata)} onReady={()=>loaded(index)} onUnavailable={unavailable}/>}
      </group>
     </group>
    </group>;
   })}
  </group>
 </group>;
}

/** Compose up to three verified bundle members using their own photographs and closed meshes. */
export default function HeroBundleModel({members,...callbacks}:Props){
 const sources=members.slice(0,3).map(product=>({product,image:product.image?.trim()||product.images.find(image=>image.url.trim())?.url||''}));
 const sourceKey=sources.map(({product,image})=>`${product.id}:${product.shape}:${image}`).join('|');
 return <BundleScene key={sourceKey} sources={sources} {...callbacks}/>;
}
