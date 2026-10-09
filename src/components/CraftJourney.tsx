'use client';
import {Component,useEffect,useId,useRef,useState,type ReactNode,type KeyboardEvent,type CSSProperties} from 'react';
import dynamic from 'next/dynamic';
import ContentImage from './ContentImage';
import {ArrowLeft,ArrowRight,RotateCcw,Scale,Beaker,Blend,PackageCheck,Package,FlaskConical} from 'lucide-react';
import {useInView} from 'motion/react';
import {useReducedMotionPreference} from '@/lib/use-reduced-motion';
import {processStudies,type ProcessStep} from '@/lib/craft';
import type {Product,StoryItem} from '@/lib/types';
import type {ContentSection} from '@/lib/site-content';
import './craft-experience.css';

const ProcessCanvas=dynamic(()=>import('./CraftProcessCanvas'),{ssr:false});
const icons=[Scale,FlaskConical,Blend,Beaker,PackageCheck,Package];
const families=[{shape:'jar',name:'Balm'},{shape:'bottle',name:'Oil'},{shape:'soap',name:'Soap'}] as const;
const number=(value:number)=>String(value).padStart(2,'0');
type Entry=ProcessStep&{image?:string};
class ProcessBoundary extends Component<{children:ReactNode;onError:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onError();}render(){return this.state.failed?null:this.props.children;}}

type CraftProps={items?:StoryItem[];product?:Pick<Product,'title'|'shape'|'tone'>;content?:ContentSection};
export default function CraftJourney(props:CraftProps){
 const {content}=props;
 if(content?.enabled===false)return null;
 if((content?.image||content?.mobileImage)&&!props.items?.length)return <div className="process-experience">
  <header className="process-heading"><div><span className="eyebrow">{content.eyebrow||'THE ART OF MAKING'}</span><h2>{content.title||'How it’s made.'}<br/><em>{content.titleEmphasis||'One step at a time.'}</em></h2></div>{content.body&&<p className="process-heading-aside content-lines">{content.body}</p>}</header>
  <figure className="process-scene" style={{margin:0,minHeight:'clamp(280px,45vw,560px)'}}><ContentImage src={content.image||content.mobileImage!} mobileSrc={content.mobileImage} alt={content.imageAlt||'The making at DYU'} fill sizes="(max-width:800px) 90vw, 80vw" style={{objectFit:'cover',objectPosition:content.imagePosition||'center'}}/>{content.caption&&<figcaption className="process-scene-label">{content.caption}</figcaption>}</figure>
 </div>;
 return <CraftSteps {...props}/>;
}

function CraftSteps({items=[],product,content}:CraftProps){
 const [selected,setSelected]=useState(0),[family,setFamily]=useState<Exclude<Product['shape'],'general'>>('jar');
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[replay,setReplay]=useState(0),[activated,setActivated]=useState(false);
 const shape=product?.shape&&product.shape!=='general'?product.shape:family;
 const actual=items.length>0;
 const entries:Entry[]=actual?items.map(item=>({short:item.name||item.title||'Making',title:item.title||item.name,description:item.description,input:'',output:'',detail:'',image:item.image})):processStudies[shape];
 const active=Math.min(selected,entries.length-1),current=entries[active];
 const id=useId(),tabs=useRef<(HTMLButtonElement|null)[]>([]),stage=useRef<HTMLDivElement>(null);
 const inView=useInView(stage,{margin:'60px 0px'}),reduced=useReducedMotionPreference();
 const showCanvas=!actual&&inView&&!failed&&(!reduced||activated);
 const Icon=icons[active%icons.length];
 useEffect(()=>{setSelected(0);setReplay(0);},[product?.title]);
 useEffect(()=>{if(!showCanvas)setReady(false);},[showCanvas]);
 if(product?.shape==='general'&&!actual)return null;
 function selectStep(next:number,focus=false){
  const index=(next+entries.length)%entries.length;
  setSelected(index);setActivated(true);
  if(focus){tabs.current[index]?.focus();tabs.current[index]?.scrollIntoView({block:'nearest',inline:'center',behavior:reduced?'instant':'smooth'});}
 }
 function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number){
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();selectStep(event.key==='Home'?0:event.key==='End'?entries.length-1:index+(event.key==='ArrowRight'?1:-1),true);
 }
 const firstSentence=current.description.match(/^.*?[.!?](?=\s|$)/)?.[0]||current.description;
 return <div className="process-experience">
  <header className="process-heading"><div><span className="eyebrow">{content?.eyebrow||<>THE ART OF MAKING{!actual?' / PROCESS PREVIEW':''}</>}</span><h2>{content?.title||'How it’s made.'}<br/><em>{content?.titleEmphasis||'One step at a time.'}</em></h2></div><div className="process-heading-aside">{!product&&!actual&&<div className="process-families" role="group" aria-label="Choose a making process">{families.map(item=><button type="button" key={item.shape} aria-pressed={shape===item.shape} onClick={()=>{setFamily(item.shape);setSelected(0);setActivated(true);}}>{item.name}</button>)}</div>}<p>{content?.body||<>{product?.title||`The ${families.find(item=>item.shape===shape)?.name.toLowerCase()} workbench`}<br/>Select a step. Watch the material change.</>}</p></div></header>
  <div className="process-timeline" role="tablist" aria-label="Making steps" style={{'--process-count':entries.length} as CSSProperties}>{entries.map((entry,index)=><button type="button" role="tab" key={index} ref={node=>{tabs.current[index]=node;}} id={`${id}-tab-${index}`} aria-label={`${number(index+1)} · ${entry.title}`} aria-selected={active===index} aria-controls={`${id}-panel`} tabIndex={active===index?0:-1} data-complete={index<active||undefined} onClick={()=>selectStep(index)} onKeyDown={event=>navigate(event,index)}><span className="process-step-number">{number(index+1)}</span><span>{entry.short}</span></button>)}</div>
  <div className="process-workbench">
   <div className="process-scene" ref={stage} aria-label={`Visual demonstration: ${current.title}`}>
    {current.image||content?.image||content?.mobileImage?<ContentImage src={current.image||content?.image||content?.mobileImage!} mobileSrc={current.image?undefined:content?.mobileImage} alt={current.image?current.title:content?.imageAlt||current.title} fill sizes="(max-width:800px) 100vw, 60vw" style={{objectFit:'cover',objectPosition:content?.imagePosition||'center'}}/>:<>
     <div className={`process-static ${showCanvas&&ready?'process-static-hidden':''}`} aria-hidden="true"><Icon strokeWidth={.75}/><span>{current.short}</span>{current.input&&<small>{current.input} → {current.output}</small>}</div>
     {showCanvas&&<div className="process-canvas"><ProcessBoundary onError={()=>setFailed(true)}><ProcessCanvas key={`${shape}-${replay}`} phase={active} shape={shape} tone={product?.tone} reduced={!!reduced} onReady={()=>setReady(true)}/></ProcessBoundary></div>}
    </>}
    <span className="process-scene-label">{content?.caption||(actual?'THE MAKING':'ILLUSTRATED WORKBENCH')} / {number(active+1)}</span>
    {!actual&&<button type="button" className="process-replay" onClick={()=>{setFailed(false);setActivated(true);setReplay(value=>value+1);setReady(false);}} aria-label="Replay this making step"><RotateCcw size={16}/><span>{failed?'Retry 3D':reduced?'View this step':'Replay step'}</span></button>}
   </div>
   <div className="process-step-detail" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`} tabIndex={0}>
    <div className="process-copy" key={`${shape}-${active}`} aria-live="polite" aria-atomic="true"><span className="process-detail-index">{number(active+1)}<small> / {number(entries.length)}</small></span><h3>{current.title}</h3><p>{firstSentence}</p>{actual&&firstSentence!==current.description&&<details className="process-full-note"><summary>Read the full step</summary><p>{current.description}</p></details>}
     {current.input&&<dl className="process-transformation"><div><dt>{content?.items?.[0]||'WE BEGIN WITH'}</dt><dd>{current.input}</dd></div><ArrowRight size={20} strokeWidth={1} aria-hidden="true"/><div><dt>{content?.items?.[1]||'IT BECOMES'}</dt><dd>{current.output}</dd></div></dl>}
    </div>
    <div className="process-navigation"><button type="button" aria-label="Previous making step" onClick={()=>selectStep(active-1)} disabled={active===0}><ArrowLeft size={20}/></button><span>{number(active+1)} / {number(entries.length)}</span><button type="button" className="process-next" aria-label={active===entries.length-1?'Restart the making process':'Next making step'} onClick={()=>selectStep(active+1)}>{active===entries.length-1?'Begin again':'Next step'}<ArrowRight size={20}/></button></div>
   </div>
  </div>
  <div className="process-footnote"><span>{content?.note||(actual?'Follow the sequence to see each stage of making.':'Illustrative process sequence. The final product will show DYU’s confirmed making steps.')}</span>{failed&&<span role="status">The process remains available as illustrated steps on this device.</span>}</div>
 </div>;
}
