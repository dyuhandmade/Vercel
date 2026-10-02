'use client';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox, useGLTF, Center, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import PhotoProductModel from './PhotoProductModel';
import type {PhotoModelMetadata} from '@/lib/photo-model';

function Label({bottle=false}:{bottle?:boolean}){
 const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d')!;x.fillStyle='#eee8d8';x.fillRect(0,0,512,512);x.fillStyle='#314333';x.textAlign='center';x.font='110px Georgia';x.fillText('dyu',256,195);x.font='22px sans-serif';x.fillText('H A N D M A D E',256,242);x.fillRect(193,278,126,1);x.font='24px Georgia';x.fillText(bottle?'Botanical oil':'Botanical balm',256,329);x.font='15px sans-serif';x.fillText('ILLUSTRATIVE DESIGN',256,411);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;},[bottle]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={[0,bottle?-.05:-.08,0]} rotation={[0,-.60,0]}><cylinderGeometry args={[bottle?.418:.745,bottle?.418:.745,bottle?1.02:.69,64,1,true,0,1.56]}/><meshStandardMaterial map={texture} roughness={.9} side={THREE.DoubleSide}/></mesh>;
}
function WoodLid({bottle}:{bottle:boolean}){
 const grain=useMemo(()=>{const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#93704c';ctx.fillRect(0,0,512,256);for(let i=0;i<180;i++){ctx.beginPath();ctx.strokeStyle=`rgba(49,28,12,${.05+(i%5)*.018})`;ctx.lineWidth=.4+(i%4)*.25;const y=i*1.5;ctx.moveTo(0,y);for(let x=0;x<=512;x+=8)ctx.lineTo(x,y+Math.sin(x*.015+i*.2)*3+Math.sin(x*.043+i)*1.5);ctx.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;return t;},[]);
 useEffect(()=>()=>grain.dispose(),[grain]);
 const r=bottle?.275:.76;const h=bottle?.32:.24;
 const points=useMemo(()=>[[0,-h/2],[r-.015,-h/2],[r,-h/2+.015],[r,h/2-.018],[r-.018,h/2],[0,h/2]].map(([x,y])=>new THREE.Vector2(x,y)),[r,h]);
 return <mesh castShadow position={[0,bottle?.8:.45,0]}><latheGeometry args={[points,96]}/><meshStandardMaterial map={grain} bumpMap={grain} bumpScale={.015} roughness={.7} color="#dbc29c"/></mesh>;
}
function AmberVessel({bottle,tone}:{bottle:boolean;tone:string}){
 const points=useMemo(()=> (bottle?[[0,-.92],[.32,-.92],[.39,-.89],[.415,-.82],[.415,.44],[.405,.53],[.36,.61],[.23,.68],[.22,.79],[0,.79]]:[[0,-.62],[.61,-.62],[.7,-.59],[.735,-.53],[.74,-.4],[.74,.26],[.72,.34],[.68,.38],[0,.38]]).map(([x,y])=>new THREE.Vector2(x,y)),[bottle]);
 return <mesh castShadow><latheGeometry args={[points,96]}/><meshPhysicalMaterial color={new THREE.Color(tone).multiplyScalar(.5)} roughness={.19} metalness={.08} clearcoat={1} clearcoatRoughness={.14} ior={1.5}/></mesh>;
}
export function ProductModel({shape='jar',tone='#95602f',lidRef}:{shape?:string;tone?:string;lidRef?:Ref<THREE.Group>}){
 if(shape==='soap')return <group rotation={[.1,-.35,-.08]}><RoundedBox args={[1.65,.68,1.12]} radius={.16} smoothness={6}><meshStandardMaterial color={tone} roughness={.95}/></RoundedBox><group ref={lidRef}><mesh position={[0,.346,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.65,.9]}/><meshStandardMaterial color='#e7dfcd' roughness={1} side={THREE.DoubleSide}/></mesh></group>{Array.from({length:28},(_,i)=><mesh key={i} position={[Math.sin(i*8)*.71,.34,Math.cos(i*12)*.44]} rotation={[Math.PI/2,0,i]}><sphereGeometry args={[.009,5,4]}/><meshStandardMaterial color='#625e3f'/></mesh>)}</group>;
 const bottle=shape==='bottle';return <group rotation={[0,-.18,-.035]}><AmberVessel bottle={bottle} tone={tone}/><group ref={lidRef}><WoodLid bottle={bottle}/>{bottle&&<mesh position={[0,1.1,0]}><capsuleGeometry args={[.14,.32,8,24]}/><meshStandardMaterial color='#292b23' roughness={.65}/></mesh>}</group><Label bottle={bottle}/></group>;
}
function Asset({url}:{url:string}){const gltf=useGLTF(url);const scene=useMemo(()=>{const copy=gltf.scene.clone(true);const size=new THREE.Box3().setFromObject(copy).getSize(new THREE.Vector3());copy.scale.multiplyScalar(1.8/Math.max(size.x,size.y,size.z,.001));return copy;},[gltf.scene]);return <Center><primitive object={scene}/></Center>;}
function Rotation({rotation}:{rotation:number}){const {invalidate}=useThree();useEffect(()=>invalidate(),[rotation,invalidate]);return null;}
function ViewerFraming({shape,ensemble,model,sourceImage,metadata}:{shape?:string;ensemble:boolean;model?:string;sourceImage?:string;metadata?:PhotoModelMetadata}){
 const {camera,size,invalidate}=useThree();
 useEffect(()=>{
  if(!(camera instanceof THREE.PerspectiveCamera)||model)return;
  const aspect=size.width/Math.max(1,size.height);
  const vertical=sourceImage?(metadata?.height||2)*1.35:ensemble?3.6:shape==='bottle'?3.05:shape==='soap'?2.05:2.0;
  const horizontal=sourceImage?(metadata?.width||2)*1.35:ensemble?4.7:shape==='bottle'?1.65:shape==='soap'?2.5:2.3;
  const distance=Math.max(vertical,horizontal/Math.max(.5,aspect))/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
  const elevation=sourceImage?0:shape==='soap'?.43:.23;
  camera.position.set(0,Math.sin(elevation)*distance,Math.cos(elevation)*distance+(metadata?.depth||0)*.5);
  camera.lookAt(0,0,0);camera.updateProjectionMatrix();invalidate();
 },[camera,size.width,size.height,shape,ensemble,model,sourceImage,metadata,invalidate]);
 return null;
}
function ViewerStatus({onReady,onUnavailable}:{onReady?:()=>void;onUnavailable?:()=>void}){
 const {gl}=useThree();const sent=useRef(false),scheduled=useRef<number|undefined>(undefined);
 const callbacks=useRef({onReady,onUnavailable});callbacks.current={onReady,onUnavailable};
 useEffect(()=>{
  const lost=(event:Event)=>{event.preventDefault();callbacks.current.onUnavailable?.();};
  gl.domElement.addEventListener('webglcontextlost',lost);
  return()=>{gl.domElement.removeEventListener('webglcontextlost',lost);if(scheduled.current!==undefined)cancelAnimationFrame(scheduled.current);sent.current=false;};
 },[gl]);
 useFrame(()=>{if(!sent.current){sent.current=true;scheduled.current=requestAnimationFrame(()=>callbacks.current.onReady?.());}});
 return null;
}
export default function ModelCanvas({shape,tone,model,sourceImage,ensemble=false,rotation=0,label='Interactive 3D product model',onReady,onUnavailable,onMetadata}:{shape?:string;tone?:string;model?:string;sourceImage?:string;ensemble?:boolean;rotation?:number;label?:string;onReady?:()=>void;onUnavailable?:()=>void;onMetadata?:(metadata:PhotoModelMetadata)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [metadata,setMetadata]=useState<PhotoModelMetadata>();
 const generated=!!sourceImage&&!model;
 const reportMetadata=useCallback((value:PhotoModelMetadata)=>{setMetadata(value);onMetadata?.(value);},[onMetadata]);
 return <Canvas ref={canvas} shadows="percentage" dpr={[1,1.6]} frameloop="demand" camera={{position:[0,generated?0:1.4,ensemble?7:4.4],fov:36}} gl={{antialias:true,preserveDrawingBuffer:!generated,alpha:true}} role="img" aria-label={label} fallback={<span>3D requires a browser with canvas support.</span>}>
  <ambientLight intensity={.7}/>
  <directionalLight position={[3,5,4]} intensity={2.5} castShadow shadow-mapSize={[1024,1024]}/>
  <directionalLight position={[-4,2,-2]} intensity={2} color="#fff3d5"/>
  <Environment resolution={128}><Lightformer intensity={3} position={[3,4,4]} scale={[3,5,1]}/><Lightformer intensity={2} position={[-3,2,2]} scale={[2,4,1]}/></Environment>
  <Suspense fallback={null}>
   <group rotation={[0,rotation,0]}>
    {model?<Asset url={model}/>:sourceImage?<PhotoProductModel key={sourceImage} image={sourceImage} shape={shape} onReady={onReady} onUnavailable={onUnavailable} onMetadata={reportMetadata}/>:ensemble?<><group position={[-.72,-.2,.15]}><ProductModel/></group><group position={[.76,.12,-.3]}><ProductModel shape="bottle" tone="#8f662f"/></group><group position={[1.23,-.62,.8]} scale={.67}><ProductModel shape="soap" tone="#9b9c74"/></group></>:<ProductModel shape={shape} tone={tone}/>}
   </group>
   <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,generated?-(metadata?.height||2)/2-.04:ensemble?-1.08:-1,0]}><planeGeometry args={[30,30]}/><shadowMaterial transparent opacity={generated?.07:.12}/></mesh>
   <ViewerStatus onReady={generated?undefined:onReady} onUnavailable={onUnavailable}/>
  </Suspense>
  <OrbitControls makeDefault enablePan={false} enableZoom={false} minPolarAngle={generated?Math.PI*.3:.6} maxPolarAngle={generated?Math.PI*.7:Math.PI/2} target={[0,0,0]}/>
  <Rotation rotation={rotation}/>
  <ViewerFraming shape={shape} ensemble={ensemble} model={model} sourceImage={generated?sourceImage:undefined} metadata={metadata}/>
 </Canvas>;
}
