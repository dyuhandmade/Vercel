'use client';
import Link from 'next/link';
import {getImageProps} from 'next/image';
import {ArrowDown,ArrowUpRight,Box,Leaf,Hand,Sun} from 'lucide-react';
import {useId,useState} from 'react';
import {motion,useMotionValue,useSpring,useReducedMotion} from 'motion/react';
import type {Product} from '@/lib/types';
import type {ContentSection} from '@/lib/site-content';
import ProductVisual from './ProductVisual';
import Overlay from './Overlay';
import './atelier-preview.css';

export type AtelierPreviewProduct=Pick<Product,'id'|'handle'|'title'|'productType'|'shape'|'tone'>&{image:string};

const copy=(value:string|undefined,fallback:string,max=160)=>(value?.trim()||fallback).slice(0,max);
const positions:Record<string,string>={left:'left center',center:'center center',right:'right center',top:'center top',bottom:'center bottom'};

export default function AtelierHero({products=[],demo=false,content,preview,discoveryHref='#collections'}:{products?:AtelierPreviewProduct[];demo?:boolean;content?:ContentSection;preview?:ContentSection;discoveryHref?:string}){
 const [open,setOpen]=useState(false);
 const [selected,setSelected]=useState(0);
 const stageId=useId();
 const product=products[selected]||products[0];
 const reduce=useReducedMotion();
 const x=useMotionValue(0),y=useMotionValue(0);
 const sx=useSpring(x,{stiffness:80,damping:25}),sy=useSpring(y,{stiffness:80,damping:25});
 const imageProps={alt:copy(content?.imageAlt,'Illustrative DYUhandmade care products with botanicals, linen and sunlit stone',250),fill:true,sizes:'100vw',fetchPriority:'high' as const,loading:'eager' as const};
 const {props:desktopImage}=getImageProps({...imageProps,src:content?.image||'/images/atelier-hero.webp'});
 const {props:mobileImage}=getImageProps({...imageProps,src:content?.mobileImage||content?.image||'/images/atelier-hero.webp'});
 const imagePosition=content?.imagePosition?positions[content.imagePosition]:undefined;
 const principles=(content?.items?.length?content.items:['Botanical inspiration','The human touch']).slice(0,2);
 return <>
  <section className="atelier-hero" onPointerMove={e=>{if(reduce||e.pointerType!=='mouse')return;const r=e.currentTarget.getBoundingClientRect();x.set((e.clientX-r.left-r.width/2)*.012);y.set((e.clientY-r.top-r.height/2)*.012);}} onPointerLeave={()=>{x.set(0);y.set(0);}}>
   <motion.div className="atelier-backdrop" style={{x:sx,y:sy}}><picture><source media="(max-width: 540px)" srcSet={mobileImage.srcSet} sizes="100vw"/><img {...desktopImage} style={{...desktopImage.style,...(imagePosition?{objectPosition:imagePosition}:{})}}/></picture></motion.div>
   <div className="atelier-wash"/>
   <div className="atelier-hero-copy">
    <p className="eyebrow"><span className="short-line"/> {copy(content?.eyebrow,'WELCOME TO THE DIGITAL ATELIER',100)}</p>
    <h1 className="content-lines">{copy(content?.title,'Rooted in nature.\nMade for')}<br/><em>{copy(content?.titleEmphasis,'slower moments.')}</em></h1>
    <p className="content-lines">{copy(content?.body,'A little nature. A human touch.\nEveryday care, with a story worth knowing.',500)}</p>
    <div className="hero-links"><Link href={content?.linkUrl||'/shop'} className="button">{copy(content?.linkLabel,'Discover your ritual',80)}</Link><Link href={content?.secondaryUrl||'/our-story'} className="text-link">{copy(content?.secondaryLabel,'The story of DYU',80)}</Link></div>
    <div className="hero-principles">{principles.map((label,index)=><span key={index}>{index===0?<Leaf size={17}/>:<Hand size={17}/>} {copy(label,'',80)}</span>)}</div>
   </div>
   {preview?.enabled!==false&&(demo||product)&&<button type="button" className="hero-explore glass-panel" onClick={()=>setOpen(true)}><span className="hero-explore-icon"><Box size={26} strokeWidth={1}/></span><span><small>{copy(preview?.eyebrow,'THE ATELIER, IN YOUR HANDS',100)}</small><strong>{copy(preview?.title,'Get a little closer.',100)}</strong><span>{copy(preview?.body,demo?'Explore three forms in 3D':'Explore the collection in 3D',160)}</span></span><span className="explore-plus">+</span></button>}
   <div className="atelier-hero-bottom"><a href={discoveryHref}><ArrowDown size={15}/> {copy(content?.note,'TAKE YOUR TIME. THERE’S MORE TO DISCOVER.',100)}</a><span><Sun size={16}/> {copy(content?.caption,'NATURE / CRAFT / RITUAL',100)}</span></div>
  </section>
  <Overlay open={open} close={()=>setOpen(false)} title={copy(preview?.caption,'A closer look',100)} className={`immersive-overlay ${demo?'':'atelier-preview-overlay'}`}>
   {demo?<><p className="muted">Three illustrative forms. Drag to explore, or use the rotation controls.</p>{open&&<ProductVisual ensemble interactive eager/>}<p className="study-note">Concept models. Final packaging will follow the approved catalogue.</p></>:product&&<>
    <p className="atelier-preview-invitation">{copy(preview?.note,'Choose an object. Turn it in your hands.',250)}</p>
    {products.length>1&&<div className="atelier-preview-choices" role="group" aria-label="Choose a product to explore">{products.map((item,index)=><button type="button" key={item.id} aria-pressed={product.id===item.id} aria-controls={stageId} onClick={()=>setSelected(index)}>{item.title}</button>)}</div>}
    <div id={stageId} className="atelier-preview-stage" aria-label={`${product.title} 3D study`}>
     {open&&<ProductVisual key={product.id} sourceImage={product.image} image={product.image} shape={product.shape} tone={product.tone} title={product.title} interactive eager/>}
    </div>
    <div className="atelier-preview-details"><div aria-live="polite"><span className="eyebrow">{product.productType}</span><h3>{product.title}</h3></div><Link href={`/products/${product.handle}`} className="text-link">{copy(preview?.linkLabel,'Meet the product',80)} <ArrowUpRight size={16} aria-hidden="true"/></Link></div>
   </>}
  </Overlay>
 </>;
}

