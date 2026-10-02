'use client';

import {useEffect,useMemo,useRef,type Ref} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Environment,Lightformer,RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {ProductModel} from './ModelCanvas';

type Shape='jar'|'bottle'|'soap';
type Props={phase:number;shape:Shape;tone?:string;reduced?:boolean;onReady?:()=>void};
const cream='#e7dfbc';
const oil='#b79b4e';
const wood='#9f7953';
const sage='#829071';
const amber='#78451d';

function Petals({count=12,radius=.4,y=0}:{count?:number;radius?:number;y?:number}){
 return <group position={[0,y,0]}>{Array.from({length:count},(_,i)=>{
  const angle=i*2.39996;const distance=Math.sqrt((i+.5)/count)*radius;
  return <mesh key={i} castShadow position={[Math.cos(angle)*distance,.015+(i%3)*.014,Math.sin(angle)*distance]} rotation={[.2,i*1.7,.12]} scale={[1,.28,2.2]}><sphereGeometry args={[.047,10,6]}/><meshStandardMaterial color={i%4===0?'#7d8451':i%3===0?'#caa54d':'#d6b869'} roughness={.94}/></mesh>;
 })}</group>;
}

function Leaves({count=7,radius=.32}:{count?:number;radius?:number}){
 return <group>{Array.from({length:count},(_,i)=><mesh key={i} castShadow position={[Math.sin(i*2.4)*radius,.025+(i%3)*.024,Math.cos(i*2.4)*radius]} rotation={[.05,i*1.8,.13]} scale={[1,.11,2.7]}><sphereGeometry args={[.105,14,8]}/><meshStandardMaterial color={i%2?sage:'#5e704e'} roughness={.96}/></mesh>)}</group>;
}

function Bowl({radius=.75,fill=cream}:{radius?:number;fill?:string}){
 const points=useMemo(()=>[[0,0],[radius*.48,0],[radius*.72,.12],[radius,.46],[radius,.51],[radius*.94,.51],[radius*.67,.16],[0,.12]].map(([x,y])=>new THREE.Vector2(x,y)),[radius]);
 return <group><mesh castShadow receiveShadow><latheGeometry args={[points,56]}/><meshStandardMaterial color="#d6cbb0" roughness={.74} side={THREE.DoubleSide}/></mesh><mesh position={[0,.395,0]} receiveShadow><cylinderGeometry args={[radius*.9,radius*.8,.06,48]}/><meshStandardMaterial color={fill} roughness={fill===oil?.27:.8}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,.43,0]}><torusGeometry args={[radius*.6,.022,8,48]}/><meshStandardMaterial color={fill===oil?'#c6ac61':'#efe7cc'} roughness={.8}/></mesh></group>;
}

function GlassVessel({radius=.5,height=1,fill=oil,level=.7,tinted=false,liquidRef}:{radius?:number;height?:number;fill?:string;level?:number;tinted?:boolean;liquidRef?:Ref<THREE.Group>}){
 const glassColor=tinted?amber:'#e3e9dc';
 return <group>
  <mesh castShadow><cylinderGeometry args={[radius,radius,height,48,1,true]}/><meshPhysicalMaterial color={glassColor} roughness={.16} metalness={.08} transparent opacity={tinted?.72:.27} side={THREE.DoubleSide} depthWrite={false}/></mesh>
  <mesh position={[0,-height/2+.025,0]}><cylinderGeometry args={[radius,radius,.05,48]}/><meshStandardMaterial color={glassColor} transparent opacity={.45} roughness={.2}/></mesh>
  <mesh position={[0,height/2,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[radius,.021,8,56]}/><meshStandardMaterial color={glassColor} roughness={.22} metalness={.08}/></mesh>
  {level>0&&<group ref={liquidRef} position={[0,-height/2+.03,0]}><mesh position={[0,height*level/2,0]}><cylinderGeometry args={[radius-.03,radius-.03,height*level,48]}/><meshStandardMaterial color={fill} roughness={fill===oil?.22:.78}/></mesh></group>}
 </group>;
}

function Spatula(){
 return <group><RoundedBox args={[.09,1.12,.065]} radius={.025} position={[0,.43,0]}><meshStandardMaterial color={wood} roughness={.82}/></RoundedBox><RoundedBox args={[.28,.36,.075]} radius={.06} position={[0,-.14,0]}><meshStandardMaterial color="#b5956f" roughness={.85}/></RoundedBox></group>;
}

function OpenContainer({shape,tone=amber,fill=true,fillRef}:{shape:Shape;tone?:string;fill?:boolean;fillRef?:Ref<THREE.Group>}){
 const bottle=shape==='bottle';
 const radius=bottle?.32:.57;
 const height=bottle?1.24:.72;
 const points=useMemo(()=>bottle?[[0,0],[.24,0],[.32,.08],[.32,.98],[.3,1.04],[.18,1.12],[.17,1.28],[.14,1.28],[.14,1.12],[.27,1.0],[.27,.08],[0,.06]].map(([x,y])=>new THREE.Vector2(x,y)):[[0,0],[.5,0],[.57,.06],[.57,.72],[.53,.72],[.53,.07],[0,.07]].map(([x,y])=>new THREE.Vector2(x,y)),[bottle]);
 if(shape==='soap')return <group>
  <RoundedBox args={[2.25,.17,1.17]} radius={.025} position={[0,.09,0]} receiveShadow castShadow><meshStandardMaterial color={wood} roughness={.85}/></RoundedBox>
  {[-1,1].map(side=><group key={side}><mesh position={[side*1.08,.32,0]} castShadow><boxGeometry args={[.14,.48,1.17]}/><meshStandardMaterial color={wood} roughness={.84}/></mesh><mesh position={[0,.32,side*.52]} castShadow><boxGeometry args={[2.1,.48,.13]}/><meshStandardMaterial color={wood} roughness={.84}/></mesh></group>)}
  {fill&&<group ref={fillRef} position={[0,.17,0]}><mesh position={[0,.135,0]}><boxGeometry args={[1.96,.27,.88]}/><meshStandardMaterial color={tone} roughness={.7}/></mesh></group>}
 </group>;
 return <group>
  <mesh castShadow receiveShadow><latheGeometry args={[points,64]}/><meshPhysicalMaterial color={tone} roughness={.24} metalness={.08} clearcoat={.8} side={THREE.DoubleSide} transparent={!!fillRef} opacity={fillRef?.78:1} depthWrite={!fillRef}/></mesh>
  {fill&&<group ref={fillRef} position={[0,.07,0]}><mesh position={[0,bottle?.47:.285,0]}><cylinderGeometry args={[radius-.055,radius-.055,bottle?.94:.57,40]}/><meshStandardMaterial color={bottle?oil:cream} roughness={bottle?.25:.83}/></mesh>{bottle&&<mesh position={[0,1.055,0]}><cylinderGeometry args={[.125,.125,.23,32]}/><meshStandardMaterial color={oil} roughness={.25}/></mesh>}</group>}
  <mesh position={[0,height*.46,radius+.006]}><planeGeometry args={[radius*1.25,height*.6]}/><meshStandardMaterial color="#e9e1ce" roughness={.92}/></mesh>
 </group>;
}

function PaperBox({shape,flap}:{shape:Shape;flap:Ref<THREE.Group>}){
 const bottle=shape==='bottle';const h=bottle?1.65:shape==='soap'?.74:1.1;const w=shape==='soap'?1.36:1.06;
 return <group>
  <RoundedBox args={[w,h,.99]} radius={.025} position={[0,h/2,0]} castShadow receiveShadow><meshStandardMaterial color="#d8cbb2" roughness={.95}/></RoundedBox>
  <mesh position={[0,h*.53,.501]}><planeGeometry args={[w*.61,h*.69]}/><meshStandardMaterial color="#eee8d7" roughness={1}/></mesh>
  <mesh position={[0,h*.52,.507]}><planeGeometry args={[w*.38,.025]}/><meshStandardMaterial color="#738165" roughness={1}/></mesh>
  <group ref={flap} position={[0,h,-.48]}><mesh position={[0,0,.48]} castShadow><boxGeometry args={[w,.036,.98]}/><meshStandardMaterial color="#d8cbb2" roughness={.94}/></mesh></group>
 </group>;
}

function ProcessScene({phase,shape,tone,reduced}:Required<Pick<Props,'phase'|'shape'|'tone'|'reduced'>>){
 const elapsed=useRef(0);
 const scoop=useRef<THREE.Group>(null);
 const botanicals=useRef<THREE.Group>(null);
 const stirrer=useRef<THREE.Group>(null);
 const pouring=useRef<THREE.Group>(null);
 const stream=useRef<THREE.Mesh>(null);
 const filled=useRef<THREE.Group>(null);
 const pouringLiquid=useRef<THREE.Group>(null);
 const inspected=useRef<THREE.Group>(null);
 const cutter=useRef<THREE.Group>(null);
 const lid=useRef<THREE.Group>(null);
 const flap=useRef<THREE.Group>(null);
 const bars=useRef<THREE.Group>(null);
 const {invalidate}=useThree();
 const isSoap=shape==='soap';
 const fill=shape==='bottle'?oil:cream;
 useEffect(()=>{elapsed.current=0;invalidate();},[phase,shape,reduced,invalidate]);
 useFrame((_,delta)=>{
  // Demand rendering can resume after a long idle interval; do not skip the new operation.
  elapsed.current=Math.min(elapsed.current+Math.min(delta,.05),4.5);
  const t=reduced?1:Math.min(elapsed.current/3.8,1);
  const eased=1-(1-t)**3;
  if(scoop.current){scoop.current.position.y=.9-eased*.36;scoop.current.rotation.z=-.42-eased*.22;}
  if(botanicals.current){botanicals.current.position.y=1.8-eased*.63;botanicals.current.rotation.y=eased*.6;}
  if(stirrer.current){stirrer.current.position.set(Math.cos(eased*Math.PI*2)*.22,.79,Math.sin(eased*Math.PI*2)*.22);stirrer.current.rotation.set(.22,0,-.35);}
  if(pouring.current){
   const seconds=reduced?4.5:elapsed.current;
   const fillProgress=1-(1-Math.min(seconds/3.2,1))**2;
   const settle=Math.min(Math.max((seconds-3.25)/1.0,0),1);
   const angle=phase===3?(-.35-Math.min(seconds/.65,1)*.42)*(1-settle):-.35-eased*.42;
   pouring.current.rotation.z=angle;
   if(filled.current)filled.current.scale.y=.08+.92*fillProgress;
   if(pouringLiquid.current)pouringLiquid.current.scale.y=1-.94*fillProgress;
   if(stream.current){
    const radius=phase===1?.34:.43;
    const halfHeight=phase===1?.35:.435;
    const lipX=pouring.current.position.x+radius*Math.cos(angle)-halfHeight*Math.sin(angle);
    const lipY=pouring.current.position.y+radius*Math.sin(angle)+halfHeight*Math.cos(angle);
    const surface=phase===1?1.17:shape==='bottle'?1.27:isSoap?.17+.27*(.08+.92*fillProgress):.07+.57*(.08+.92*fillProgress);
    stream.current.position.set(lipX,(lipY+surface)/2,pouring.current.position.z);
    stream.current.scale.set(1,Math.max(.05,lipY-surface),1);
    stream.current.visible=phase!==3||(!reduced&&seconds<3.25);
   }
  }
  if(inspected.current){inspected.current.position.z=.3+eased*.26;inspected.current.rotation.y=-.22+eased*.38;}
  if(cutter.current)cutter.current.position.y=.65-eased*.58;
  if(bars.current)bars.current.children.forEach((bar,index)=>{bar.position.x=(index-1)*(1.05+eased*.15);});
  if(lid.current)lid.current.position.y=(1-eased)*.95;
  if(flap.current)flap.current.rotation.x=-(1-eased)*1.2;
  if(!reduced&&elapsed.current<4.5)invalidate();
 });

 return <group>
  <RoundedBox args={[5.15,.22,3.4]} radius={.09} position={[0,-.15,0]} receiveShadow castShadow><meshStandardMaterial color="#bb9d75" roughness={.88}/></RoundedBox>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.035,.12]} receiveShadow><planeGeometry args={[3.8,2.45]}/><meshStandardMaterial color="#d9d3ba" roughness={1}/></mesh>

  {phase===0&&<>
   <group position={[-1.02,0,.08]}><RoundedBox args={[1.52,.19,1.12]} radius={.07} position={[0,.1,0]} castShadow><meshStandardMaterial color="#e4e0d3" roughness={.8}/></RoundedBox><mesh position={[0,.22,0]} castShadow><cylinderGeometry args={[.6,.6,.06,48]}/><meshStandardMaterial color="#b4b8ac" roughness={.4} metalness={.45}/></mesh><mesh position={[0,.116,.568]}><planeGeometry args={[.42,.105]}/><meshStandardMaterial color="#4e6050" roughness={.5}/></mesh><group position={[0,.29,0]} scale={.69}><Bowl fill="#c8b882"/><group position={[0,.45,0]}><Leaves count={8}/></group><Petals radius={.43} y={.48}/></group></group>
   <group position={[.95,.39,-.43]}><GlassVessel radius={.43} height={.78} level={.65}/></group>
   <group position={[.8,0,.75]} scale={.7}><Bowl/><mesh position={[.08,.5,0]} scale={[1,.5,.7]}><sphereGeometry args={[.34,20,12]}/><meshStandardMaterial color={cream} roughness={.85}/></mesh></group>
   <group ref={scoop} position={[-.45,.9,-.15]} rotation={[.2,0,-.42]}><Spatula/></group>
   <group position={[1.6,.02,-.45]}><Leaves count={4} radius={.2}/></group>
  </>}

  {phase===1&&<>
   <group position={[.1,.76,.07]}><GlassVessel radius={.68} height={1.5} level={.73} fill={isSoap?'#d8c38d':oil}/></group>
   {!isSoap&&<group ref={botanicals} position={[.1,1.8,.07]}><Petals count={20} radius={.57}/><Leaves count={4} radius={.25}/></group>}
   {isSoap&&<><group ref={pouring} position={[-.77,1.9,.05]} rotation={[0,0,-.35]}><GlassVessel radius={.34} height={.7} level={.7} fill="#e7e6ce"/></group><mesh ref={stream} position={[-.15,1.56,.05]}><cylinderGeometry args={[.043,.06,1,14]}/><meshStandardMaterial color="#e4dbb6" roughness={.5}/></mesh></>}
   <group position={[-1.2,0,.62]} scale={.62}><Bowl fill={oil}/>{!isSoap&&<Petals count={13} y={.44} radius={.53}/>}</group>
   <group position={[1.27,.42,-.35]}><GlassVessel radius={.33} height={.83} level={.62} fill={oil}/></group>
   <group position={[1.32,.07,.68]} rotation={[Math.PI/2,0,-.45]} scale={.74}><Spatula/></group>
  </>}

  {phase===2&&<>
   <group scale={1.22}><Bowl radius={.91} fill={isSoap?'#c7c099':fill}/></group>
   <group ref={stirrer} position={[.22,.79,0]} rotation={[.22,0,-.35]}><Spatula/></group>
   <group position={[-1.43,.32,-.57]}><GlassVessel radius={.29} height={.63} fill={oil} level={.31}/></group>
   <group position={[1.32,0,.55]} scale={.57}><Bowl fill={cream}/></group>
   {!isSoap&&<group position={[-1.25,.02,.65]}><Leaves count={3} radius={.18}/></group>}
  </>}

  {phase===3&&<>
   <group position={[.18,0,.2]}><OpenContainer shape={shape} tone={tone} fillRef={filled}/></group>
   <group ref={pouring} position={[shape==='bottle'?-.43:-.73,isSoap?1.63:shape==='bottle'?2.08:1.7,.18]} rotation={[0,0,-.35]}><GlassVessel radius={.43} height={.87} level={.52} fill={fill} liquidRef={pouringLiquid}/></group>
   <mesh ref={stream} position={[.03,isSoap?.98:shape==='bottle'?1.54:1.16,.2]}><cylinderGeometry args={[.061,.046,1,16]}/><meshStandardMaterial color={fill} roughness={shape==='bottle'?.2:.66}/></mesh>
   <group position={[-1.39,0,.62]} scale={.57}><Bowl fill={fill}/></group>
   <group position={[1.54,.03,-.68]} rotation={[Math.PI/2,0,-.4]} scale={.71}><Spatula/></group>
  </>}

  {phase===4&&(isSoap?<>
   <group ref={bars} position={[0,.33,.12]}>{[-1,0,1].map(index=><group key={index} position={[index*1.2,0,0]}><RoundedBox args={[1.02,.58,1.03]} radius={.055} castShadow receiveShadow><meshStandardMaterial color={tone} roughness={.89}/></RoundedBox><Petals count={5} radius={.35} y={.3}/></group>)}</group>
   <group ref={cutter} position={[-.6,.65,.12]}><mesh position={[0,1.0,0]} castShadow><boxGeometry args={[.15,.18,1.4]}/><meshStandardMaterial color={wood} roughness={.82}/></mesh>{[-1,1].map(side=><mesh key={side} position={[0,.54,side*.64]} castShadow><cylinderGeometry args={[.018,.018,.93,12]}/><meshStandardMaterial color="#9b9e91" metalness={.7} roughness={.33}/></mesh>)}<mesh position={[0,.08,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.006,.006,1.28,8]}/><meshStandardMaterial color="#bcc2b8" metalness={.8} roughness={.3}/></mesh></group>
  </>:<>
   <group position={[-1.1,0,-.27]} scale={.9}><OpenContainer shape={shape} tone={tone}/></group>
   <group position={[0,0,-.4]} scale={.9}><OpenContainer shape={shape} tone={tone}/></group>
   <group ref={inspected} position={[1.09,0,.3]}><OpenContainer shape={shape} tone={tone}/></group>
   <mesh position={[-.66,.02,1.0]} rotation={[-Math.PI/2,0,-.14]}><planeGeometry args={[1.35,.55]}/><meshStandardMaterial color="#eee8d9" roughness={1}/></mesh>
  </>)}

  {phase===5&&<>
   <group position={[-.67,shape==='bottle'?.94:isSoap?.37:.64,.25]} scale={isSoap?.92:1}><ProductModel shape={shape} tone={tone} lidRef={lid}/></group>
   <group position={[1.05,0,-.28]} rotation={[0,-.2,0]}><PaperBox shape={shape} flap={flap}/></group>
   {isSoap&&<mesh position={[-.67,.36,.79]}><planeGeometry args={[.58,.48]}/><meshStandardMaterial color="#e7dfcd" roughness={1}/></mesh>}
  </>}
 </group>;
}

function Framing(){
 const {camera,size,invalidate}=useThree();
 useEffect(()=>{
  if(camera instanceof THREE.OrthographicCamera){camera.zoom=Math.min(size.width/6.6,size.height/4.4);camera.lookAt(0,.72,0);camera.updateProjectionMatrix();invalidate();}
 },[camera,size.width,size.height,invalidate]);
 return null;
}

function FirstFrameReady({onReady}:{onReady?:()=>void}){
 const sent=useRef(false);
 const scheduled=useRef<number|undefined>(undefined);
 useEffect(()=>()=>{if(scheduled.current!==undefined)cancelAnimationFrame(scheduled.current);sent.current=false;},[]);
 useFrame(()=>{if(!sent.current){sent.current=true;scheduled.current=requestAnimationFrame(()=>onReady?.());}});
 return null;
}

export default function CraftProcessCanvas({phase,shape,tone='#95602f',reduced=false,onReady}:Props){
 const safePhase=Math.max(0,Math.min(5,Math.floor(phase)));
 return <Canvas orthographic camera={{position:[4.3,4.2,6.5],zoom:80,near:.1,far:40}} shadows="percentage" frameloop="demand" dpr={[1,1.5]} gl={{antialias:true,alpha:true}} fallback={<div className="making-canvas-fallback">The illustrated process is available in the chapter descriptions.</div>} aria-label={`Illustrative 3D making process, step ${safePhase+1} of 6`}>
  <ambientLight intensity={1.2}/><directionalLight position={[-3,6,4]} intensity={2.4} color="#fff4de" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-.0005}/><directionalLight position={[4,3,-3]} intensity={1.5} color="#e4e9d7"/>
  <Environment resolution={64}><Lightformer position={[0,5,1]} intensity={2} scale={[5,3,1]} rotation={[-Math.PI/3,0,0]}/><Lightformer position={[-3,2,4]} intensity={1.4} scale={[2,4,1]}/></Environment>
  <ProcessScene phase={safePhase} shape={shape} tone={tone} reduced={reduced}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.275,0]} receiveShadow><planeGeometry args={[30,30]}/><shadowMaterial transparent opacity={.13}/></mesh>
  <Framing/>
  <FirstFrameReady onReady={onReady}/>
 </Canvas>;
}
