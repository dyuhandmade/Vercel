'use client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {Component,useCallback,useEffect,useId,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import {motion,useInView,useMotionValue,useMotionValueEvent,useScroll} from 'motion/react';
import {useReducedMotionPreference} from '@/lib/use-reduced-motion';
import {ArrowDown,Leaf,RotateCcw} from 'lucide-react';
import type {StoryItem} from '@/lib/types';
import type {ContentSection} from '@/lib/site-content';
import {botanicalStudies} from '@/lib/atelier';
import IngredientAtlas from './IngredientAtlas';
import './ingredient-discovery.css';

const AssemblyCanvas=dynamic(()=>import('./IngredientAssemblyCanvas'),{ssr:false});
class AssemblyBoundary extends Component<{children:ReactNode;onError:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onError();}render(){return this.state.failed?null:this.props.children;}}
type Props={items?:StoryItem[];shape?:string;tone?:string;content?:ContentSection};

function BotanicalDiscovery({shape='jar',tone='#95602f',content}:Props){
 const container=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),sticky=useRef<HTMLDivElement>(null);
 const choices=useRef<(HTMLButtonElement|null)[]>([]);
 const manual=useRef(false);
 const reduced=useReducedMotionPreference();
 const inView=useInView(stage,{margin:'80px 0px'});
 const {scrollYProgress}=useScroll({target:container,offset:['start 0.25','end 0.8']});
 const progress=useMotionValue(0);
 const [selected,setSelected]=useState(0),[phase,setPhase]=useState(0),[controlled,setControlled]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 const [fits,setFits]=useState(true),[attempt,setAttempt]=useState(0);
 const id=useId();
 useMotionValueEvent(scrollYProgress,'change',value=>{if(!manual.current&&!reduced)progress.set(value);});
 useMotionValueEvent(progress,'change',value=>{const next=value<.3?0:value<.8?1:2;setPhase(previous=>previous===next?previous:next);});
 function unfold(value:number){manual.current=true;setControlled(true);progress.set(value);}
 function followScroll(){manual.current=false;setControlled(false);progress.set(scrollYProgress.get());}
 function selectBotanical(index:number,focus=false){
  const next=(index+botanicalStudies.length)%botanicalStudies.length;
  setSelected(next);unfold(1);
  if(focus)choices.current[next]?.focus({preventScroll:true});
 }
 function navigateBotanicals(event:KeyboardEvent<HTMLButtonElement>,index:number){
  const offsets:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-2,ArrowDown:2};
  if(event.key!=='Home'&&event.key!=='End'&&!(event.key in offsets))return;
  event.preventDefault();
  selectBotanical(event.key==='Home'?0:event.key==='End'?botanicalStudies.length-1:index+offsets[event.key],true);
 }
 const markReady=useCallback(()=>setReady(true),[]);
 const markFailed=useCallback(()=>{setReady(false);setFailed(true);},[]);
 function retry(){
  setReady(false);setFailed(false);setAttempt(value=>value+1);
  unfold(progress.get());
  stage.current?.scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
 }
 const botanical=botanicalStudies[selected];
 const showCanvas=inView&&!failed&&(!reduced||controlled);
 const visible3d=showCanvas&&ready;
 useEffect(()=>{if(!showCanvas)setReady(false);},[showCanvas]);
 useEffect(()=>{
  if(!showCanvas||ready)return;
  const timeout=window.setTimeout(markFailed,20000);
  return()=>window.clearTimeout(timeout);
 },[showCanvas,ready,attempt,markFailed]);
 useEffect(()=>{
  const panel=sticky.current,section=container.current;if(!panel||!section)return;
  const measure=()=>{const top=parseFloat(getComputedStyle(section).getPropertyValue('--botanical-top'))||0;setFits(panel.scrollHeight+top+20<=window.innerHeight);};
  const observer=new ResizeObserver(measure);observer.observe(panel);window.addEventListener('resize',measure);measure();
  return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
 },[]);
 return <div className={`botanical-discovery ${reduced?'botanical-reduced':''} ${!fits?'botanical-unpinned':''}`} ref={container}>
  <div className="botanical-sticky" ref={sticky}>
   <div className="botanical-heading"><div><span className="eyebrow">{content?.eyebrow||'LOOK WITHIN / A BOTANICAL STUDY'}</span><h2>{content?.title||'A little world.'}<br/><em>{content?.titleEmphasis||'Waiting to unfold.'}</em></h2></div><p>{content?.body||<>{reduced?'Open the object. Choose a botanical.':'Scroll to open. Touch a detail.'}<br/>A closer look changes everything.</>}</p></div>
   <div className="botanical-stage" ref={stage}>
    <div className="botanical-orbit" aria-hidden="true"/>
    <div className={`botanical-poster ${visible3d?'botanical-poster-hidden':''}`} aria-hidden="true"><Image src={`/images/${shape}-atelier.png`} alt="" fill sizes="(max-width:600px) 38vw, 30vw"/></div>
    {showCanvas&&<div className="botanical-webgl"><AssemblyBoundary key={attempt} onError={markFailed}><AssemblyCanvas progress={progress} shape={shape} tone={tone} selected={selected} reduced={!!reduced} onReady={markReady} onError={markFailed}/></AssemblyBoundary></div>}
    <div className="botanical-nodes" role="group" aria-label="Explore botanical forms" aria-describedby={`${id}-keys`}>{botanicalStudies.map((item,index)=><button type="button" className={`botanical-node botanical-node-${index}`} key={item.name} ref={node=>{choices.current[index]=node;}} aria-label={`Explore ${item.name}`} aria-pressed={selected===index} aria-controls={`${id}-detail`} onClick={()=>selectBotanical(index)} onKeyDown={event=>navigateBotanicals(event,index)}><span className="botanical-node-ring"><span className="botanical-node-number">0{index+1}</span>{!visible3d&&<Leaf size={25} strokeWidth={1}/>}</span><span className="botanical-node-label">{item.name}</span></button>)}</div>
    <span id={`${id}-keys`} className="botanical-keyboard-help">Use the arrow keys to explore the botanical forms. Home chooses the first and End the last.</span>
    <span className="botanical-centre-note">{['THE OBJECT','THE OPENING','THE DETAILS'][phase]}</span>
   </div>
   <div className="botanical-detail" id={`${id}-detail`} aria-live="polite" aria-atomic="true"><span className="botanical-detail-number">0{selected+1}</span><div><h3>{botanical.name}</h3><span>{botanical.latin}</span></div><div className="botanical-detail-copy"><p>{botanical.description}</p><small>{botanical.note}</small></div></div>
   <div className="botanical-controls"><div role="group" aria-label="Product assembly stages">{['The object','Open it','Look within'].map((label,index)=><button type="button" key={label} aria-pressed={phase===index} onClick={()=>unfold([0,.55,1][index])}><span>0{index+1}</span>{label}</button>)}</div>{controlled&&!reduced?<button type="button" className="botanical-follow" onClick={followScroll}><RotateCcw size={14}/> Follow my scroll</button>:<span className="botanical-scroll-note"><ArrowDown size={14}/>{reduced?'Choose a stage above':'Continue slowly'}</span>}</div>
   {failed&&<div className="botanical-recovery"><p role="status">The 3D study could not load. The still life and every botanical detail remain available.</p><button type="button" onClick={retry}><RotateCcw size={15}/> Retry botanical 3D</button></div>}
   <div className="botanical-study-note"><span>Illustrative forms & packaging · A visual study, not a product formulation.</span></div>
   <motion.div className="botanical-scroll-progress" style={{scaleX:progress}} aria-hidden="true"/>
  </div>
 </div>;
}

export default function IngredientDiscovery({items=[],...props}:Props){
 // Approved catalogue ingredients keep their own images and descriptions.
 if(items.length)return <div className="ingredient-catalogue-discovery"><div className="botanical-heading"><div><span className="eyebrow">{props.content?.eyebrow||'LOOK WITHIN / THE INGREDIENT STORY'}</span><h2>{props.content?.title||'Every detail.'}<br/><em>{props.content?.titleEmphasis||'Worth knowing.'}</em></h2></div><p>{props.content?.body||'Choose an ingredient to discover its story.'}</p></div><IngredientAtlas items={items}/></div>;
 return <BotanicalDiscovery {...props}/>;
}
