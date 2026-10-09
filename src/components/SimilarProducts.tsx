'use client';
import {useSiteContent} from './SiteContentProvider';
import {editableText} from '@/lib/content-safety';

import Link from 'next/link';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import type {ProductRecommendation} from '@/lib/product-recommendations';
import type {ContentSection} from '@/lib/content-safety';
import ProductCard from './ProductCard';
import './similar-products.css';

export default function SimilarProducts({recommendations,content}:{recommendations:ProductRecommendation[];content?:ContentSection}) {
 const siteContent=useSiteContent();
 const t=(key:string,fallback:string)=>editableText(siteContent,key,fallback);
 const viewport=useRef<HTMLDivElement>(null),group=useRef<HTMLUListElement>(null);
 const focused=useRef(false),dragging=useRef(false),visible=useRef(false);
 const gestureStart=useRef({x:0,y:0});
 const resumeAt=useRef(0),cycleWidth=useRef(0),step=useRef(0);
 const [reduced,setReduced]=useState(false);
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
  if(!loop||reduced||content?.carouselAutoplay===false)return;
  let frame=0,previous=0,fraction=0;
  const move=(now:number)=>{
   const elapsed=previous?Math.min(now-previous,50):0;previous=now;
   const scroller=viewport.current;
   if(scroller&&cycleWidth.current&&visible.current&&!document.hidden&&!focused.current&&!dragging.current&&now>=resumeAt.current){
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
 },[loop,reduced,content?.carouselAutoplay]);

 function navigate(direction:number) {
  const scroller=viewport.current;if(!scroller||!cycleWidth.current)return;
  resumeAt.current=performance.now()+5000;
  const position=(scroller.scrollLeft+direction*step.current+cycleWidth.current)%cycleWidth.current;
  scroller.scrollLeft=position;
 }

 if(!count||content?.enabled===false)return null;
 return <section id="similar-products" className="section similar-products" aria-labelledby="similar-products-heading" aria-roledescription="carousel" data-product-count={count}>
  <div className="section-heading"><div><p className="eyebrow">{content?.eyebrow||'KEEP A LITTLE CURIOSITY'}</p><h2 id="similar-products-heading">{content?.title||'There’s more'}{' '}<em>{content?.titleEmphasis||'to discover.'}</em></h2><p className="similar-intro">{content?.body||'Explore rituals with a little in common.'}</p></div><Link href={content?.linkUrl||'/shop'} className="text-link">{content?.linkLabel||'All rituals'}</Link></div>
  <div className="similar-toolbar"><span>{count} {count===1?t("related-count-single","related ritual"):t("related-count-plural","related rituals")}</span>{loop&&<div className="similar-controls" role="group" aria-label="Similar product controls">
   <button type="button" aria-controls="similar-product-stream" aria-label="Previous similar product" onClick={()=>navigate(-1)}><ChevronLeft size={20}/></button>
   <button type="button" aria-controls="similar-product-stream" aria-label="Next similar product" onClick={()=>navigate(1)}><ChevronRight size={20}/></button>
  </div>}</div>
  <div className="similar-viewport" ref={viewport} id="similar-product-stream" aria-label="Similar products, ordered by relevance"
   onPointerDown={event=>{gestureStart.current={x:event.clientX,y:event.clientY};dragging.current=true;}}
   onPointerMove={event=>{
    const x=Math.abs(event.clientX-gestureStart.current.x),y=Math.abs(event.clientY-gestureStart.current.y);
    if(event.pointerType==='touch'&&y>8&&y>x)dragging.current=false;
   }}
   onPointerUp={()=>{if(dragging.current){dragging.current=false;resumeAt.current=performance.now()+4000;}}}
   onPointerCancel={()=>{if(dragging.current){dragging.current=false;resumeAt.current=performance.now()+4000;}}}
   onWheel={event=>{
    // Scrolling down to this section must not delay autoplay. Only yield
    // when the shopper is deliberately scrolling the product stream.
    if(Math.abs(event.deltaX)>Math.abs(event.deltaY)||event.shiftKey)resumeAt.current=performance.now()+4000;
   }}
   onFocusCapture={event=>{
    focused.current=true;
    const target=event.target as HTMLElement;
    const item=target.closest<HTMLElement>('.similar-item');
    // Keep keyboard navigation in view without moving a pressed button away
    // from a pointer before its click is delivered.
    if(item&&viewport.current&&target.matches(':focus-visible'))viewport.current.scrollLeft=item.offsetLeft;
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
