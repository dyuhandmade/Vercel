'use client';
import {useId,useState} from 'react';
import Image from 'next/image';
import {Plus,Leaf} from 'lucide-react';
import type {StoryItem} from '@/lib/types';
import {botanicalStudies} from '@/lib/atelier';

export default function IngredientAtlas({items,preview=false}:{items?:StoryItem[];preview?:boolean}){
 const data=items?.length?items:botanicalStudies;
 const isStudy=preview||!items?.length;
 const [selected,setSelected]=useState(0);
 const index=Math.min(selected,data.length-1);
 const current=data[index];
 const uid=useId();
 const image=isStudy?'/images/botanical-study.webp':current.image;
 return <div className={`atlas-experience ${isStudy?'':'atlas-catalogue'}`}>
  <div className="atlas-scene">
   {image?<Image src={image} alt={isStudy?'Illustrative botanical study of flowers, aloe, and plant butter':current.name} fill sizes="(max-width:800px) 100vw, 65vw"/>:<div className="atlas-material-placeholder"><Leaf size={100} strokeWidth={.5}/><span>{current.name}</span><small>Explore the ingredient story</small></div>}
   {image&&<div className="atlas-scene-shade"/>}
   <div className="atlas-topline"><span className="eyebrow">FIELD NOTES / {String(index+1).padStart(2,'0')}</span><Leaf size={22} strokeWidth={1}/></div>
   {isStudy&&<div className="atlas-nodes" aria-label="Explore botanical details">{data.slice(0,6).map((item,i)=><button key={item.name} className={`atlas-node atlas-node-${i} ${index===i?'selected':''}`} aria-pressed={index===i} aria-controls={`${uid}-detail`} onClick={()=>setSelected(i)}><span className="node-cross"><Plus size={17}/></span><span>{item.name}</span></button>)}</div>}
   <span className="atlas-caption">{isStudy?'A closer look changes everything.':image?current.name:'Nature, with a story to tell.'}</span>
  </div>
  <div className="atlas-detail glass-panel" id={`${uid}-detail`} aria-live="polite">
   <span className="eyebrow">{isStudy?'A BOTANICAL STUDY':'THE INGREDIENT STORY'}</span>
   <div className="atlas-detail-top"><span className="atlas-detail-index">{String(index+1).padStart(2,'0')}</span><Leaf size={28} strokeWidth={1}/></div>
   <h3>{current.name}</h3>
   {isStudy&&<span className="botanical-latin">{botanicalStudies[index]?.latin}</span>}
   <p>{current.description}</p>
   <div className="atlas-material">{isStudy?botanicalStudies[index]?.note:'Explore each ingredient below.'}</div>
   <div className="atlas-pager">{data.map((item,i)=><button key={item.handle||item.name} aria-label={`Read about ${item.name}`} aria-controls={`${uid}-detail`} aria-pressed={index===i} className={index===i?'active':''} onClick={()=>setSelected(i)}>{String(i+1).padStart(2,'0')}</button>)}</div>
   {isStudy&&<p className="study-note">Illustrative studies from our design direction, not a product ingredient list.</p>}
  </div>
 </div>;
}
