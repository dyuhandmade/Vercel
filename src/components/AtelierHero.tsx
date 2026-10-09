'use client';
import Link from 'next/link';
import {getImageProps} from 'next/image';
import {ArrowDown,ArrowUpRight,Box,Leaf,Hand,Sun,Pause,Play} from 'lucide-react';
import {useEffect,useId,useState} from 'react';
import {motion,useMotionValue,useSpring,useReducedMotion} from 'motion/react';
import type {Product} from '@/lib/types';
import type {ContentSection} from '@/lib/site-content';
import {atelierSlides} from '@/lib/hero-content';
import ProductVisual from './ProductVisual';
import Overlay from './Overlay';
import './atelier-preview.css';
import './atelier-hero-carousel.css';

export type AtelierPreviewProduct=Pick<Product,'id'|'handle'|'title'|'productType'|'shape'|'tone'>&{image:string};

const copy=(value:string|undefined,fallback:string,max=160)=>(value?.trim()||fallback).slice(0,max);

export default function AtelierHero({products=[],demo=false,content,slides=[],preview,discoveryHref='#collections'}:{products?:AtelierPreviewProduct[];demo?:boolean;content?:ContentSection;slides?:ContentSection[];preview?:ContentSection;discoveryHref?:string}){
 const [open,setOpen]=useState(false);
 const [selected,setSelected]=useState(0);
 const [activeSlide,setActiveSlide]=useState(0);
 const [paused,setPaused]=useState(false);
 const stageId=useId();
 const product=products[selected]||products[0];
 const reduce=useReducedMotion();
 const x=useMotionValue(0),y=useMotionValue(0);
 const sx=useSpring(x,{stiffness:80,damping:25}),sy=useSpring(y,{stiffness:80,damping:25});
 const heroSlides=atelierSlides(content,slides);
 const currentIndex=activeSlide%Math.max(heroSlides.length,1);
 const activeContent=heroSlides[currentIndex]?.content||content;
 const autoplay=content?.carouselAutoplay!==false;
 const intervalMs=content?.carouselInterval||2000;
 useEffect(()=>{
  if(reduce||paused||!autoplay||content?.enabled===false||heroSlides.length<2)return;
  const interval=window.setInterval(()=>{
   if(!document.hidden)setActiveSlide(index=>(index+1)%heroSlides.length);
  },intervalMs);
  return()=>window.clearInterval(interval);
 },[reduce,paused,autoplay,intervalMs,content?.enabled,heroSlides.length]);
 const principles=(activeContent?.items?.length?activeContent.items:['Botanical inspiration','The human touch']).slice(0,2);
 if(content?.enabled===false)return null;
 return <>
  <section className={`atelier-hero${(activeContent?.title?.length||0)>60||(activeContent?.titleEmphasis?.length||0)>60||(activeContent?.body?.length||0)>200?' has-long-copy':''}`} onPointerMove={e=>{if(reduce||e.pointerType!=='mouse')return;const r=e.currentTarget.getBoundingClientRect();x.set((e.clientX-r.left-r.width/2)*.012);y.set((e.clientY-r.top-r.height/2)*.012);}} onPointerLeave={()=>{x.set(0);y.set(0);}}>
   <motion.div className="atelier-backdrop" style={{x:sx,y:sy}} aria-hidden="true">{heroSlides.map((slide,index)=>{
    const imageProps={alt:slide.alt,fill:true,sizes:'100vw',fetchPriority:index===0?'high' as const:'auto' as const,loading:'eager' as const};
    const {props:desktopImage}=getImageProps({...imageProps,src:slide.image});
    const {props:mobileImage}=getImageProps({...imageProps,src:slide.mobileImage});
    return <picture key={slide.handle} className={`atelier-backdrop-slide${currentIndex===index?' is-active':''}`}>
     <source media="(max-width: 540px)" srcSet={mobileImage.srcSet} sizes="100vw"/>
     <img {...desktopImage} style={{...desktopImage.style,...(slide.position?{objectPosition:slide.position}:{})}}/>
    </picture>;
   })}</motion.div>
   <div className="atelier-wash"/>
   <div className="atelier-hero-copy">
    <p className="eyebrow"><span className="short-line"/> {copy(activeContent?.eyebrow,'WELCOME TO THE DIGITAL ATELIER',100)}</p>
    <h1 className="content-lines">{copy(activeContent?.title,'Rooted in nature.')}<br/><em>{copy(activeContent?.titleEmphasis,'Made for beautiful\nmoments.')}</em></h1>
    <p className="content-lines">{copy(activeContent?.body,'A little nature. A human touch.\nEveryday care, with a story worth knowing.',500)}</p>
    <div className="hero-links"><Link href={activeContent?.linkUrl||'/shop'} className="button">{copy(activeContent?.linkLabel,'Discover your ritual',80)}</Link><Link href={activeContent?.secondaryUrl||'/our-story'} className="text-link">{copy(activeContent?.secondaryLabel,'The story of DYU',80)}</Link></div>
    <div className="hero-principles">{principles.map((label,index)=><span key={index}>{index===0?<Leaf size={17}/>:<Hand size={17}/>} {copy(label,'',80)}</span>)}</div>
   </div>
   {preview?.enabled!==false&&(demo||product)&&<button type="button" className="hero-explore glass-panel" onClick={()=>setOpen(true)}><span className="hero-explore-icon"><Box size={26} strokeWidth={1}/></span><span><small>{copy(preview?.eyebrow,'THE ATELIER, IN YOUR HANDS',100)}</small><strong>{copy(preview?.title,'Get a little closer.',100)}</strong><span>{copy(preview?.body,demo?'Explore three forms in 3D':'Explore the collection in 3D',160)}</span></span><span className="explore-plus">+</span></button>}
   {heroSlides.length>1&&<div className="atelier-carousel-controls" role="group" aria-label="Hero slides">
    {heroSlides.map((slide,index)=><button key={slide.handle} type="button" aria-label={`Show slide ${index+1}`} aria-pressed={currentIndex===index} onClick={()=>{setActiveSlide(index);setPaused(true);}}><span/></button>)}
    {autoplay&&<button type="button" className="atelier-carousel-autoplay" onClick={()=>setPaused(value=>!value)} aria-label={paused?'Play slideshow':'Pause slideshow'}>{paused?<Play size={14}/>:<Pause size={14}/>}</button>}
   </div>}
   <div className="atelier-hero-bottom"><a href={discoveryHref}><ArrowDown size={15}/> {copy(activeContent?.note,'TAKE YOUR TIME. THERE’S MORE TO DISCOVER.',100)}</a><span><Sun size={16}/> {copy(activeContent?.caption,'NATURE / CRAFT / RITUAL',100)}</span></div>
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

