'use client';

import {useEffect,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {preparePhotoModel,type PhotoModelMetadata} from '@/lib/photo-model';
import {createInferredSurface,createObjectFront,createVesselTextures} from '@/lib/photo-materials';
import {createPhotoSolid,layoutPhotoObjects} from '@/lib/photo-solid-geometry';
import {createPhotoVessel} from '@/lib/photo-vessel-geometry';

export type {PhotoModelMetadata} from '@/lib/photo-model';
type Props={image:string;shape?:string;onReady?:()=>void;onUnavailable?:()=>void;onMetadata?:(metadata:PhotoModelMetadata)=>void};
type Part={geometry:THREE.BufferGeometry;materials:THREE.Material[];position:[number,number,number]};
type Asset={parts:Part[];textures:THREE.Texture[]};

export default function PhotoProductModel({image,shape,onReady,onUnavailable,onMetadata}:Props){
 const {invalidate,gl}=useThree();
 const [asset,setAsset]=useState<Asset|null>(null);
 const group=useRef<THREE.Group>(null),readyAsset=useRef<Asset|null>(null),readyFrame=useRef<number|undefined>(undefined);
 const callbacks=useRef({onReady,onUnavailable,onMetadata});callbacks.current={onReady,onUnavailable,onMetadata};
 useFrame(()=>{
  if(asset&&group.current&&readyAsset.current!==asset){readyAsset.current=asset;readyFrame.current=requestAnimationFrame(()=>callbacks.current.onReady?.());}
 });
 useEffect(()=>{
  const controller=new AbortController();
  const owned:Asset={parts:[],textures:[]};
  const ownedMaterials=new Set<THREE.Material>(),ownedGeometry=new Set<THREE.BufferGeometry>();
  const ownMaterial=<T extends THREE.Material>(material:T)=>{ownedMaterials.add(material);return material;};
  const ownGeometry=(geometry:THREE.BufferGeometry)=>{ownedGeometry.add(geometry);return geometry;};
  const dispose=()=>{ownedGeometry.forEach(g=>g.dispose());ownedGeometry.clear();ownedMaterials.forEach(m=>m.dispose());ownedMaterials.clear();owned.textures.forEach(t=>t.dispose());owned.textures.length=0;};
  readyAsset.current=null;setAsset(null);
  const texture=(source:HTMLCanvasElement,color=true)=>{
   const t=new THREE.CanvasTexture(source);if(color)t.colorSpace=THREE.SRGBColorSpace;
   t.anisotropy=Math.min(4,gl.capabilities.getMaxAnisotropy());owned.textures.push(t);return t;
  };
  const frontMaterial=(source:HTMLCanvasElement)=>{
   const map=texture(source);
   return ownMaterial(new THREE.MeshStandardMaterial({map,color:'#aaaaaa',roughness:.86,metalness:0,emissive:'#ffffff',emissiveMap:map,emissiveIntensity:.3}));
  };
  preparePhotoModel(image,shape,controller.signal).then(photo=>{
   if(controller.signal.aborted)return;
   if(photo.objects.length){
    const layout=layoutPhotoObjects(photo.objects);let depth=0;
    for(const object of photo.objects){
     const region={x:object.bounds.x/photo.analysis.width,y:object.bounds.y/photo.analysis.height,width:object.bounds.width/photo.analysis.width,height:object.bounds.height/photo.analysis.height};
     if(object.kind==='jar'&&!object.contour){
      const vessel=createPhotoVessel(object,photo.analysis,layout);
      vessel.parts.forEach(part=>ownGeometry(part.geometry));
      const surfaces=createVesselTextures(photo.photo,region,object.kind,object.color,vessel.profile);
      for(const part of vessel.parts){
       const map=texture(surfaces[part.surface]);
       const lid=part.surface==='lid'||part.surface==='top';
       const material=ownMaterial(new THREE.MeshStandardMaterial({map,color:part.surface==='top'?'#aaaaaa':'#cccccc',roughness:lid?surfaces.lidRoughness:surfaces.bodyRoughness,metalness:lid?surfaces.lidMetalness:surfaces.bodyMetalness,emissive:'#ffffff',emissiveMap:map,emissiveIntensity:part.surface==='top'?.3:.1,envMapIntensity:.65}));
       owned.parts.push({geometry:part.geometry,materials:[material],position:vessel.position});
      }
      depth=Math.max(depth,vessel.depth);continue;
     }
     const surface=createInferredSurface(photo.photo,region,object.kind,object.color,object.kind==='jar'&&Boolean(object.contour));
     const front=frontMaterial(createObjectFront(photo.photo,region,object.kind,object.color));
     const bump=surface.bump?texture(surface.bump,false):undefined;
     const material=(canvas:HTMLCanvasElement)=>ownMaterial(new THREE.MeshStandardMaterial({map:texture(canvas),roughness:surface.roughness,metalness:surface.metalness,bumpMap:bump,bumpScale:object.kind==='box'?.002:.005,envMapIntensity:.7}));
     const solid=createPhotoSolid(object,photo.analysis,layout);
     ownGeometry(solid.geometry);
     const back=material(surface.back),side=solid.materialOrder.some(key=>key==='side')?material(surface.side):back;
     depth=Math.max(depth,solid.depth+Math.abs(solid.position[2])*2);
     const materials={front,back,side};
     owned.parts.push({geometry:solid.geometry,materials:solid.materialOrder.map(key=>materials[key]),position:solid.position});
    }
    callbacks.current.onMetadata?.({kind:'volume',construction:'solids',parts:photo.objects.length,partKinds:photo.objects.map(object=>object.kind),width:layout.width,height:layout.height,depth,confidence:Math.min(...photo.objects.map(o=>o.confidence))});
   }else{
    const geometry=ownGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position',new THREE.BufferAttribute(photo.positions,3));geometry.setAttribute('uv',new THREE.BufferAttribute(photo.uvs,2));geometry.setIndex(new THREE.BufferAttribute(photo.indices,1));
    geometry.addGroup(0,photo.frontCount,0);geometry.addGroup(photo.frontCount,photo.indices.length-photo.frontCount,1);geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const bounds=photo.analysis.bounds;
    const region={x:bounds.x/photo.analysis.width,y:bounds.y/photo.analysis.height,width:bounds.width/photo.analysis.width,height:bounds.height/photo.analysis.height};
    const surface=createInferredSurface(photo.photo,region,'general',photo.color);
    const body=ownMaterial(new THREE.MeshStandardMaterial({map:texture(surface.back),roughness:.8}));
    owned.parts.push({geometry,materials:[frontMaterial(photo.texture),body],position:[0,0,0]});
    callbacks.current.onMetadata?.({...photo.metadata,construction:photo.metadata.kind==='relief'?'relief':'silhouette',parts:1});
   }
   setAsset(owned);invalidate();
  }).catch(error=>{dispose();if(!controller.signal.aborted&&error?.name!=='AbortError')callbacks.current.onUnavailable?.();});
  return()=>{
   controller.abort();if(readyFrame.current!==undefined)cancelAnimationFrame(readyFrame.current);
   dispose();
  };
 },[image,shape,invalidate,gl]);
 return asset?<group ref={group} dispose={null}>{asset.parts.map((part,i)=><mesh key={i} geometry={part.geometry} material={part.materials.length===1?part.materials[0]:part.materials} position={part.position} castShadow receiveShadow/>)}</group>:null;
}
