'use client';

import {useId,useRef,useState,type KeyboardEvent} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,ArrowUpRight} from 'lucide-react';
import './philosophy-experience.css';
import type {SiteContent} from '@/lib/site-content';

const defaultPerspectives=[
 {word:'Nature.',label:'Nature',image:'/images/botanical-study.webp',position:'center 44%',alt:'Illustrative botanical study with flowers, leaves, and natural textures',line:'There is a whole world in the smallest detail.',link:'/ingredients',action:'Meet the botanicals',note:'A world worth looking closer at'},
 {word:'Human touch.',label:'Human touch',image:'/images/atelier-craft-v2.webp',position:'center',alt:'Illustrative atelier scene exploring the care and detail of making',line:'The things we choose can invite us to notice the hands behind them.',link:'/how-its-made',action:'Follow the making',note:'The beauty is in the attention'},
 {word:'Your everyday.',label:'Your everyday',image:'/images/atelier-ritual-v2.webp',position:'center',alt:'Illustrative everyday ritual with warm light and botanical care objects',line:'A familiar moment can become a little time that belongs to you.',link:'/shop',action:'Find your ritual',note:'The story continues with you'}
];

export default function PhilosophyExperience({content}:{content?:SiteContent}){
 const introduction=content?.sections['philosophy'];
 const perspectives=defaultPerspectives.map((item,index)=>{
  const saved=content?.sections[['philosophy-nature','philosophy-human-touch','philosophy-everyday'][index]];
  return {...item,word:saved?.title||item.word,label:saved?.caption||item.label,image:saved?.image||item.image,position:saved?.imagePosition||item.position,alt:saved?.imageAlt||item.alt,line:saved?.body||item.line,link:saved?.linkUrl||item.link,action:saved?.linkLabel||item.action,note:saved?.note||item.note};
 });
 const [selected,setSelected]=useState(0);
 const id=useId();
 const buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const current=perspectives[selected];
 const number=(index:number)=>String(index+1).padStart(2,'0');

 function choose(next:number,focus=false){
  const index=(next+perspectives.length)%perspectives.length;
  setSelected(index);
  if(focus)buttons.current[index]?.focus();
 }

 function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number){
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  choose(event.key==='Home'?0:event.key==='End'?perspectives.length-1:index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1),true);
 }

 return <section className="philosophy-experience" aria-labelledby={`${id}-heading`}>
  <div className="philosophy-scene" aria-hidden="true"><div className="philosophy-scene-reveal" key={current.image}><Image src={current.image} alt="" fill sizes="100vw" style={{objectPosition:current.position}}/></div></div>
  <div className="philosophy-shade" aria-hidden="true"/>
  <div className="philosophy-topline"><h2 id={`${id}-heading`}>{introduction?.title||'Our philosophy'}</h2><span>{introduction?.body||'Choose what draws you in'}</span></div>
  <div className="philosophy-words" role="tablist" aria-label="Explore our philosophy" aria-orientation="vertical">
   {perspectives.map((perspective,index)=><button type="button" role="tab" key={perspective.label}
    ref={node=>{buttons.current[index]=node;}} id={`${id}-tab-${index}`} aria-label={perspective.label}
    aria-selected={selected===index} aria-controls={`${id}-panel`} tabIndex={selected===index?0:-1}
    onClick={()=>choose(index)} onKeyDown={event=>navigate(event,index)}
   ><small>{number(index)}</small><span>{perspective.word}</span><ArrowUpRight aria-hidden="true" size={25} strokeWidth={1}/></button>)}
  </div>
  <div className="philosophy-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${selected}`} tabIndex={0}>
   <div className="philosophy-panel-copy" key={selected}>
    <span className="philosophy-detail-note">{current.note}</span>
    <p aria-live="polite">{current.line}</p>
    <Link href={current.link} className="philosophy-next-link">{current.action}<ArrowUpRight size={19} strokeWidth={1.3} aria-hidden="true"/></Link>
   </div>
  </div>
  <div className="philosophy-bottomline">
   <div className="philosophy-controls"><button type="button" aria-label="Previous philosophy chapter" onClick={()=>choose(selected-1)}><ArrowLeft size={19} strokeWidth={1.3}/></button><span aria-label={`Chapter ${selected+1} of ${perspectives.length}`}>{number(selected)}<i>/ {number(perspectives.length-1)}</i></span><button type="button" aria-label="Next philosophy chapter" onClick={()=>choose(selected+1)}><ArrowRight size={19} strokeWidth={1.3}/></button></div>
   <span className="philosophy-footnote">{introduction?.note||'Illustrative scenes · The world of DYUhandmade'}</span>
  </div>
 </section>;
}
