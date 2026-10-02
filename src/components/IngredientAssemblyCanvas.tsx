'use client';
import {useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Environment,Lightformer} from '@react-three/drei';
import type {MotionValue} from 'motion/react';
import * as THREE from 'three';
import {ProductModel} from './ModelCanvas';

type AssemblyProps={progress:MotionValue<number>;shape:string;tone:string;selected:number;reduced:boolean;onReady:()=>void;onError:()=>void};

function Flower({white=false}:{white?:boolean}){
 const count=white?13:24;
 return <group rotation={[.3,.2,0]}>
  {Array.from({length:count},(_,i)=>{const angle=i/count*Math.PI*2;return <mesh key={i} position={[Math.cos(angle)*.27,Math.sin(angle)*.27,0]} rotation={[0,0,angle-Math.PI/2]} scale={[white?.09:.06,.24,.045]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={white?'#eee9d9':i%2?'#d59435':'#e9b346'} roughness={.63}/></mesh>;})}
  <mesh position={[0,0,.08]} scale={[1,1,.45]}><sphereGeometry args={[.16,20,12]}/><meshStandardMaterial color={white?'#b49439':'#825629'} roughness={.9}/></mesh>
  {Array.from({length:16},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.1,Math.cos(i*2.4)*.1,.15]}><sphereGeometry args={[.023,6,4]}/><meshStandardMaterial color={white?'#d0ae48':'#b08137'}/></mesh>)}
 </group>;
}
function Aloe(){
 const leaf=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(0,-.3);shape.bezierCurveTo(.24,-.1,.15,.26,0,.73);shape.bezierCurveTo(-.1,.2,-.18,-.12,0,-.3);return shape;},[]);
 return <group rotation={[.2,.4,-.12]}>{[-1.05,-.52,0,.52,1.05].map((angle,i)=><mesh key={i} rotation={[i*.13,0,angle]} position={[0,-.05,i*-.025]} scale={i%2?.82:1}><extrudeGeometry args={[leaf,{depth:.055,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.025}]}/><meshPhysicalMaterial color={i%2?'#6f865a':'#87956b'} roughness={.4} clearcoat={.5}/></mesh>)}</group>;
}
function Shea(){return <group rotation={[.3,0,.1]}>{[[0,0,0,.35],[.27,-.12,.03,.25],[-.2,-.14,.12,.25],[.03,.19,-.02,.23]].map(([x,y,z,r],i)=><mesh key={i} position={[x,y,z]} rotation={[i*.5,i*.7,i*.9]} scale={[1,.8,.72]}><dodecahedronGeometry args={[r,2]}/><meshStandardMaterial color={i%2?'#e5d5b4':'#f0e4cd'} roughness={.78}/></mesh>)}</group>;}

function Assembly({progress,shape,tone,selected,reduced,onReady,onError}:AssemblyProps){
 const {camera,size,invalidate,gl}=useThree();
 const lid=useRef<THREE.Group>(null),vessel=useRef<THREE.Group>(null),productFit=useRef<THREE.Group>(null);
 const productBounds=useMemo(()=>new THREE.Box3(),[]);
 const botanicals=useRef<(THREE.Group|null)[]>([]);
 const models=useRef<(THREE.Group|null)[]>([]);
 const current=useRef(progress.get());
 const rendered=useRef(false);
 const lastFit=useRef({progress:NaN,width:0,height:0,shape:''});
 const mobile=size.width<600;
 const scale=mobile?1.35:1;
 useEffect(()=>{const cam=camera as THREE.OrthographicCamera;cam.zoom=size.width/8;cam.updateProjectionMatrix();invalidate();},[camera,size.width,size.height,invalidate]);
 useEffect(()=>progress.on('change',()=>invalidate()),[progress,invalidate]);
 useEffect(()=>{invalidate();},[selected,invalidate,reduced]);
 useEffect(()=>{
  const canvas=gl.domElement;
  const handleLoss=()=>onError();
  canvas.addEventListener('webglcontextlost',handleLoss);
  return()=>canvas.removeEventListener('webglcontextlost',handleLoss);
 },[gl,onError]);
 useFrame(({clock},delta)=>{
  const target=progress.get();current.current=reduced?target:THREE.MathUtils.damp(current.current,target,8,Math.min(delta,.05));
  const open=THREE.MathUtils.smoothstep(current.current,0,.6);
  const spread=THREE.MathUtils.smoothstep(current.current,.18,.95);
  if(lid.current){lid.current.position.y=open*(shape==='bottle'?.65:1);lid.current.rotation.z=-.1*open;lid.current.rotation.y=open*.4;}
  if(vessel.current){vessel.current.rotation.y=-.18+open*.23;vessel.current.position.y=shape==='bottle'?-.15-open*.25:-open*.4;}
  const previousFit=lastFit.current;
  if(productFit.current&&(!Number.isFinite(previousFit.progress)||Math.abs(previousFit.progress-current.current)>.0001||previousFit.width!==size.width||previousFit.height!==size.height||previousFit.shape!==shape)){
   // Keep the camera's eight-unit width for alignment with the HTML botanical
   // controls, and fit only the moving product to the available canvas height.
   const product=productFit.current;
   product.scale.setScalar(shape==='bottle'?scale*.8:scale);
   product.updateWorldMatrix(true,true);
   productBounds.setFromObject(product);
   const halfHeight=size.height/size.width*4;
   const yExtent=Math.max(Math.abs(productBounds.min.y),Math.abs(productBounds.max.y));
   const xExtent=Math.max(Math.abs(productBounds.min.x),Math.abs(productBounds.max.x));
   const fit=Math.min(1,halfHeight*.87/Math.max(yExtent,.01),1.6/Math.max(xExtent,.01));
   product.scale.multiplyScalar(fit);
   lastFit.current={progress:current.current,width:size.width,height:size.height,shape};
  }
  botanicals.current.forEach((item,index)=>{if(!item)return;const left=index%2===0;const top=index<2;const distance=.13+spread*.87;item.position.set((left?-2.4:2.4)*distance,(top?1:-1)*(size.height/size.width*2)*distance,0);item.scale.setScalar((.025+spread*.975)*(mobile?1.15:.64));});
  models.current.forEach((item,index)=>{
   if(!item)return;
   const emphasis=index===selected?1.1:.96;
   item.scale.setScalar(reduced?emphasis:THREE.MathUtils.damp(item.scale.x,emphasis,8,Math.min(delta,.05)));
   // Let the chosen form move; its neighbours remain calm and easy to compare.
   const turn=index===selected?Math.sin(clock.elapsedTime*.35)*.4:0;
   item.rotation.y=reduced?0:THREE.MathUtils.damp(item.rotation.y,turn,8,Math.min(delta,.05));
  });
  if(!rendered.current){rendered.current=true;onReady();}
  if(!reduced||Math.abs(current.current-target)>.001)invalidate();
 });
 return <>
  <ambientLight intensity={1.6}/><directionalLight position={[-3,4,6]} intensity={2.7} color="#fff5dd"/><directionalLight position={[4,-2,3]} intensity={1.4}/>
  <Environment resolution={64}><Lightformer position={[-3,3,4]} intensity={2.5} scale={[3,5,1]}/><Lightformer position={[4,2,2]} intensity={2} scale={[2,4,1]}/></Environment>
  <group ref={productFit}><group ref={vessel}><ProductModel shape={shape} tone={tone} lidRef={lid}/></group></group>
  {[<Flower key="calendula"/>,<Flower white key="chamomile"/>,<Aloe key="aloe"/>,<Shea key="shea"/>].map((model,index)=><group key={index} ref={node=>{botanicals.current[index]=node;}} scale={0}><group ref={node=>{models.current[index]=node;}}>{model}</group></group>)}
 </>;
}

export default function IngredientAssemblyCanvas(props:AssemblyProps){
 return <Canvas orthographic camera={{position:[0,0,8],zoom:100,near:.1,far:30}} dpr={[1,1.5]} frameloop="demand" gl={{alpha:true,antialias:true,powerPreference:'low-power'}} aria-hidden="true" style={{pointerEvents:'none'}}><Assembly {...props}/></Canvas>;
}
