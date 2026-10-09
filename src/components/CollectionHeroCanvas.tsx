'use client';

import {Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Environment,Lightformer,OrbitControls,useGLTF} from '@react-three/drei';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import * as THREE from 'three';
import PhotoProductModel from './PhotoProductModel';
import HeroBundleModel from './HeroBundleModel';
import {ProductModel} from './ModelCanvas';
import HeroBotanicals,{type BotanicalKind} from './HeroBotanicals';
import {heroLayout,type HeroProduct,type HeroViewCommand} from '@/lib/hero-scene';
import type {PhotoModelMetadata} from '@/lib/photo-model';

function stoneTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d')!;
 const pixels=ctx.createImageData(512,512);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const i=(y*512+x)*4;
  const grain=(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
  const vein=Math.sin(x*.024+Math.sin(y*.016)*2.4)*Math.sin(y*.012+x*.008);
  const speck=grain>.965?-22:grain*4;
  const shade=vein*9+speck;
  pixels.data[i]=211+shade;pixels.data[i+1]=195+shade;pixels.data[i+2]=169+shade;pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.6,1.6);
 return texture;
}

function StoneDisc({radius,moving}:{radius:number;moving:boolean}){
 const disc=useRef<THREE.Group>(null);
 const texture=useMemo(stoneTexture,[]);
 const profile=useMemo(()=>[
  [0,-.29],[radius-.07,-.29],[radius-.018,-.275],[radius,-.245],
  [radius,-.065],[radius-.012,-.032],[radius-.045,-.009],[radius-.09,0],[0,0],
 ].map(([r,y])=>new THREE.Vector2(r,y)),[radius]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 useFrame((_,delta)=>{if(moving&&disc.current)disc.current.rotation.y=(disc.current.rotation.y+Math.min(delta,.05)*.16)%(Math.PI*2);});
 return <group ref={disc} name="rotating-stone-disc">
  <mesh castShadow receiveShadow><latheGeometry args={[profile,128]}/><meshStandardMaterial map={texture} bumpMap={texture} bumpScale={.018} roughness={.92}/></mesh>
  {/* Inlaid marks make the slow movement visible even on a circular plinth. */}
  {Array.from({length:24},(_,i)=>{const angle=i/24*Math.PI*2;return <mesh key={i} position={[Math.sin(angle)*(radius-.11),.003,Math.cos(angle)*(radius-.11)]} rotation={[-Math.PI/2,0,-angle]}><planeGeometry args={[.008,i%6===0?.064:.03]}/><meshStandardMaterial color="#a58c57" roughness={.72} metalness={.15}/></mesh>;})}
 </group>;
}

function NativeProduct({url,onMetadata,onReady}:{url:string;onMetadata:(value:PhotoModelMetadata)=>void;onReady:()=>void}){
 const {scene}=useGLTF(url);
 const model=useMemo(()=>{
  const clone=scene.clone(true);clone.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(clone),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const scale=2/Math.max(size.x,size.y,size.z,.001);
  clone.position.sub(center);clone.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true;}});
  return {clone,scale,metadata:{kind:'volume' as const,width:size.x*scale,height:size.y*scale,depth:size.z*scale,confidence:1}};
 },[scene]);
 useEffect(()=>{onMetadata(model.metadata);onReady();},[model,onMetadata,onReady]);
 return <group scale={model.scale}><primitive object={model.clone}/></group>;
}

function PhotoHeroProduct({product,onMetadata,onReady,onUnavailable}:{product:HeroProduct;onMetadata:(value:PhotoModelMetadata)=>void;onReady:()=>void;onUnavailable:()=>void}){
 const candidates=useMemo(()=>[...new Set([product.image,...product.images.map(image=>image.url)].filter((url):url is string=>Boolean(url)))].slice(0,4),[product.image,product.images]);
 const [index,setIndex]=useState(0);
 const accepted=useRef(false);
 const next=()=>{accepted.current=false;if(index+1<candidates.length)setIndex(index+1);else onUnavailable();};
 return candidates[index]?<PhotoProductModel key={candidates[index]} image={candidates[index]} shape={product.shape}
  onMetadata={metadata=>{
   // A marketing sheet can only produce a photographic relief; try a clean
   // product photograph instead of putting that rectangle on the plinth.
   if(metadata.kind==='relief'){next();return;}
   accepted.current=true;onMetadata(metadata);
  }} onReady={()=>{if(accepted.current)onReady();}} onUnavailable={next}/>:null;
}

function HeroOrbit({radius,height,depth,enabled,command,onDragChange}:{radius:number;height:number;depth:number;enabled:boolean;command?:HeroViewCommand;onDragChange:(dragging:boolean)=>void}){
 const {camera,size,invalidate}=useThree();
 const controls=useRef<OrbitControlsImpl>(null);
 useEffect(()=>{
  const orbit=controls.current;
  if(!(camera instanceof THREE.PerspectiveCamera)||!orbit)return;
  const targetY=height*.39-.1;
  const aspect=size.width/Math.max(size.height,1),elevation=.22;
  // Fit the complete disc and botanicals as well as tall oil bottles.
  const vertical=height+.75+radius*.35;
  const span=Math.max(vertical,radius*2.35/Math.max(.5,aspect));
  const distance=span/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))+depth*.3;
  const damping=orbit.enableDamping;orbit.enableDamping=false;orbit.update();
  orbit.target.set(0,targetY,0);
  camera.position.set(.12,targetY+distance*Math.sin(elevation),distance*Math.cos(elevation));
  camera.lookAt(orbit.target);camera.updateProjectionMatrix();orbit.update();orbit.saveState();orbit.enableDamping=damping;invalidate();
 },[camera,size.width,size.height,radius,height,depth,invalidate]);
 useEffect(()=>{
  const orbit=controls.current;if(!orbit||!command||!enabled)return;
  if(command.action==='reset'){
   // Flush any remaining drag momentum before restoring the saved front view.
   const damping=orbit.enableDamping;orbit.enableDamping=false;orbit.update();orbit.reset();orbit.enableDamping=damping;
  }else if(command.action==='left'||command.action==='right'){
   orbit.setAzimuthalAngle(orbit.getAzimuthalAngle()+(command.action==='left'?-1:1)*Math.PI/8);
  }else{
   orbit.setPolarAngle(THREE.MathUtils.clamp(orbit.getPolarAngle()+(command.action==='up'?-1:1)*.15,orbit.minPolarAngle,orbit.maxPolarAngle));
  }
  invalidate();
 },[command,enabled,invalidate]);
 return <OrbitControls ref={controls} makeDefault enabled={enabled} enablePan={false} enableZoom={false}
  enableDamping dampingFactor={.12} rotateSpeed={.65} minPolarAngle={Math.PI*.2} maxPolarAngle={Math.PI*.48}
  onStart={()=>onDragChange(true)} onEnd={()=>onDragChange(false)}/>;
}

function Scene({product,members,botanical,moving,command,onDragChange,onReady,onUnavailable,onMetadata}:{product:HeroProduct;members:HeroProduct[];botanical:BotanicalKind;moving:boolean;command?:HeroViewCommand;onDragChange:(dragging:boolean)=>void;onReady:()=>void;onUnavailable:()=>void;onMetadata:(metadata:PhotoModelMetadata)=>void}){
 const [metadata,setMetadata]=useState<PhotoModelMetadata>();
 const [ready,setReady]=useState(false);
 const {gl,invalidate}=useThree();
 const callbacks=useRef({onReady,onUnavailable,onMetadata});callbacks.current={onReady,onUnavailable,onMetadata};
 const report=useCallback((value:PhotoModelMetadata)=>{setMetadata(value);callbacks.current.onMetadata(value);},[]);
 const loaded=useCallback(()=>{setReady(true);callbacks.current.onReady();invalidate();},[invalidate]);
 const unavailable=useCallback(()=>callbacks.current.onUnavailable(),[]);
 const layout=heroLayout(product.shape,metadata);
 const source=product.image||product.images[0]?.url;
 useEffect(()=>{
  const lost=(event:Event)=>{event.preventDefault();callbacks.current.onUnavailable();};
  gl.domElement.addEventListener('webglcontextlost',lost);
  return()=>gl.domElement.removeEventListener('webglcontextlost',lost);
 },[gl]);
 useEffect(()=>{if(!source&&!product.model)loaded();},[source,product.model,loaded]);
 useEffect(()=>{gl.domElement.dataset.discRadius=layout.radius.toFixed(3);},[gl,layout.radius]);
 return <>
  <ambientLight intensity={.85}/>
  <directionalLight position={[-3,6,5]} intensity={2.6} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-normalBias={.025} shadow-bias={-.0001} shadow-radius={4}/>
  <directionalLight position={[4,2,3]} intensity={1.2} color="#fff8eb"/>
  <Environment resolution={64}><Lightformer intensity={2} position={[0,4,4]} scale={[5,4,1]}/><Lightformer intensity={1} position={[-4,2,0]} scale={[3,4,1]}/></Environment>
  <Suspense fallback={null}>
   <group visible={ready}>
    <StoneDisc radius={layout.radius} moving={moving}/>
    <group name="stationary-product" position={[.04,layout.productY,-.12]} rotation={[0,-.055,0]} scale={layout.productScale}>
     {product.model?<NativeProduct url={product.model} onMetadata={report} onReady={loaded}/>:members.length?<HeroBundleModel members={members} onReady={loaded} onUnavailable={unavailable} onMetadata={report}/>:source?<PhotoHeroProduct product={product} onReady={loaded} onUnavailable={unavailable} onMetadata={report}/>:<ProductModel shape={product.shape} tone={product.tone}/>}
    </group>
    <group name="stationary-botanicals" position={[-layout.radius*.67,.03,.29]} rotation={[0,.35,0]}><HeroBotanicals kind={botanical} scale={layout.ornamentScale}/></group>
    <group position={[layout.radius*.68,.025,.5]} rotation={[0,-1.15,0]}><HeroBotanicals kind={botanical} scale={layout.ornamentScale*.7} accent/></group>
    <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-.305,0]}><planeGeometry args={[20,20]}/><shadowMaterial transparent opacity={.10}/></mesh>
   </group>
  </Suspense>
  <HeroOrbit radius={layout.radius} height={layout.height} depth={layout.depth} enabled={ready} command={command} onDragChange={onDragChange}/>
 </>;
}

export default function CollectionHeroCanvas(props:Parameters<typeof Scene>[0]){
 return <Canvas shadows="percentage" dpr={[1,1.6]} frameloop={props.moving?'always':'demand'} camera={{position:[0,2,7],fov:33}} gl={{antialias:true,alpha:true}} role="img" aria-label={`3D ${props.product.title} with ${props.botanical.replace('-',' ')} on a stone disc`} fallback={<span>3D requires WebGL support.</span>}>
  <Scene {...props}/>
 </Canvas>;
}
