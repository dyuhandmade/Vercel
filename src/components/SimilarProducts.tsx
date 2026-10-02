'use client';

import Link from 'next/link';
import {ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import type {ProductRecommendation} from '@/lib/product-recommendations';
import ProductCard from './ProductCard';
import './similar-products.css';

export default function SimilarProducts({recommendations}:{recommendations:ProductRecommendation[]}) {
 const viewport=useRef<HTMLDivElement>(null),group=useRef<HTMLUListElement>(null);
 const hovered=useRef(false),focused=useRef(false),dragging=useRef(false),visible=useRef(false);
 const resumeAt=useRef(0),cycleWidth=useRef(0),step=useRef(0);
 const [paused,setPaused]=useState(false),[reduced,setReduced]=useState(false);
 const count=recommendations.length,loop=count>1;

 useEffect(()=>{
  const scroller=viewport.current,first=group.current;if(!scroller||!first)return;
  const measure=()=>{
   const gap=window.innerWidth<=540?18:30;
   const shown=Math.min(count,scroller.clientWidth>=900?3:scroller.clientWidth>=580?2:1.15);
   const width=(scroller.clientWidth-gap*(shown-1))/shown;
   scroller.style.setProperty('--similar-card-width',`${count===1?Math.min(width,440):width}px`);
   step.current=width+gap;
   cycleWidth.current=first.getBoundingClientRect().width;
   if(loop&&cycleWidth.current)scroller.scrollLeft%=cycleWidth.current;
  };
  const resize=new ResizeObserver(measure);resize.observe(scroller);measure();
  const observer=new IntersectionObserver(([entry])=>{visible.current=entry.isIntersecting;},{threshold:.1});observer.observe(scroller);
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const motion=()=>setReduced(media.matches);motion();media.addEventListener('change',motion);
  const release=()=>{if(dragging.current){dragging.current=false;resumeAt.current=performance.now()+4000;}};
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  return ()=>{resize.disconnect();observer.disconnect();media.removeEventListener('change',motion);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);};
 },[count,loop]);

 useEffect(()=>{
  if(!loop||paused||reduced)return;
  let frame=0,previous=0,fraction=0;
  const move=(now:number)=>{
   const elapsed=previous?Math.min(now-previous,50):0;previous=now;
   const scroller=viewport.current;
   if(scroller&&cycleWidth.current&&visible.current&&!document.hidden&&!hovered.current&&!focused.current&&!dragging.current&&now>=resumeAt.current){
    // scrollLeft is rounded to whole pixels on some Windows displays. Carry
    // the subpixel distance forward so slow motion cannot stall at 60 fps.
    fraction+=elapsed*.028;
    const distance=Math.floor(fraction);fraction-=distance;
    if(distance)scroller.scrollLeft=(scroller.scrollLeft+distance)%cycleWidth.current;
   }
   frame=requestAnimationFrame(move);
  };
  frame=requestAnimationFrame(move);
  return ()=>cancelAnimationFrame(frame);
 },[loop,paused,reduced]);

 function navigate(direction:number) {
  const scroller=viewport.current;if(!scroller||!cycleWidth.current)return;
  resumeAt.current=performance.now()+5000;
  const position=(scroller.scrollLeft+direction*step.current+cycleWidth.current)%cycleWidth.current;
  scroller.scrollLeft=position;
 }

 if(!count)return null;
 return <section id="similar-products" className="section similar-products" aria-labelledby="similar-products-heading" aria-roledescription="carousel" data-product-count={count}>
  <div className="section-heading"><div><p className="eyebrow">KEEP A LITTLE CURIOSITY</p><h2 id="similar-products-heading">There’s more<br/><em>to discover.</em></h2><p className="similar-intro">Explore rituals with a little in common.</p></div><Link href="/shop" className="text-link">All rituals</Link></div>
  <div className="similar-toolbar"><span>{count} {count===1?'related ritual':'related rituals'}</span>{loop&&<div className="similar-controls" role="group" aria-label="Similar product controls">
   {!reduced&&<button type="button" className="similar-play" aria-label={paused?'Play similar products':'Pause similar products'} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={16}/>:<Pause size={16}/>}<span>{paused?'Play':'Pause'}</span></button>}
   <button type="button" aria-controls="similar-product-stream" aria-label="Previous similar product" onClick={()=>navigate(-1)}><ChevronLeft size={20}/></button>
   <button type="button" aria-controls="similar-product-stream" aria-label="Next similar product" onClick={()=>navigate(1)}><ChevronRight size={20}/></button>
  </div>}</div>
  <div className="similar-viewport" ref={viewport} id="similar-product-stream" aria-label="Similar products, ordered by relevance"
   onPointerEnter={event=>{if(event.pointerType==='mouse')hovered.current=true;}}
   onPointerLeave={()=>{hovered.current=false;}}
   onPointerDown={()=>{dragging.current=true;}}
   onPointerUp={()=>{dragging.current=false;resumeAt.current=performance.now()+4000;}}
   onPointerCancel={()=>{dragging.current=false;resumeAt.current=performance.now()+4000;}}
   onWheel={()=>{resumeAt.current=performance.now()+4000;}}
   onFocusCapture={event=>{
    focused.current=true;
    const item=(event.target as HTMLElement).closest<HTMLElement>('.similar-item');
    if(item&&viewport.current)viewport.current.scrollLeft=item.offsetLeft;
   }}
   onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget)){focused.current=false;resumeAt.current=performance.now()+1500;}}}
   onScroll={()=>{const scroller=viewport.current;if(loop&&scroller&&cycleWidth.current&&scroller.scrollLeft>=cycleWidth.current)scroller.scrollLeft-=cycleWidth.current;}}>
   <div className="similar-track">
    <ul ref={group} className="similar-group" aria-label="Recommended rituals">{recommendations.map(({product,reason},index)=><li className="similar-item" key={product.id} data-product-handle={product.handle}><ProductCard product={product} index={index}/><p className="similar-reason">{reason}</p></li>)}</ul>
    {loop&&<ul className="similar-group similar-copy" aria-hidden="true">{recommendations.map(({product,reason},index)=><li className="similar-item" key={product.id}><ProductCard product={product} index={index} duplicate/><p className="similar-reason">{reason}</p></li>)}</ul>}
   </div>
  </div>
 </section>;
}
