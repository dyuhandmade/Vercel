'use client';

import Image from 'next/image';
import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
import {Box,ImageIcon,Pause,Play} from 'lucide-react';
import type {Product,ProductMedia} from '@/lib/types';
import ProductVisual from './ProductVisual';
import './product-experience.css';
import './product-gallery.css';

export default function Gallery({product:p}:{product:Product}) {
 const [index,setIndex]=useState(0),[desktop,setDesktop]=useState(false);
 const [mobileModel,setMobileModel]=useState(false);
 const [playback,setPlayback]=useState<'auto'|'play'|'pause'>('auto');
 const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false);
 const [visible,setVisible]=useState(false),[pageActive,setPageActive]=useState(true),[reduced,setReduced]=useState(false);
 const stageId=useId(),hintId=useId();
 const thumbs=useRef<HTMLDivElement>(null);
 const imageGallery=useRef<HTMLDivElement>(null);
 const mobileToggle=useRef<HTMLButtonElement>(null);
 const showMobileModel=!desktop&&mobileModel;
 useEffect(()=>{setIndex(0);setMobileModel(false);},[p.id]);
 useEffect(()=>{
  if(desktop)setMobileModel(false);
  else{setPlayback('auto');setHovered(false);setFocused(false);}
 },[desktop]);
 useEffect(()=>{
  const wide=window.matchMedia('(min-width: 801px)');
  const touchPhone=window.matchMedia('(pointer: coarse) and (max-width: 1024px)');
  const update=()=>setDesktop(wide.matches&&!touchPhone.matches);
  update();wide.addEventListener('change',update);touchPhone.addEventListener('change',update);
  return ()=>{wide.removeEventListener('change',update);touchPhone.removeEventListener('change',update);};
 },[]);
 useEffect(()=>{
  const element=imageGallery.current;if(!element)return;
  const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting&&entry.intersectionRatio>=.1),{threshold:.1});
  observer.observe(element);
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const motion=()=>setReduced(media.matches),visibility=()=>setPageActive(!document.hidden);
  motion();visibility();media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);
  return ()=>{observer.disconnect();media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{
  const rail=thumbs.current,selected=rail?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
  if(!rail||!selected)return;
  if(!desktop){
   if(selected.offsetLeft<rail.scrollLeft)rail.scrollLeft=selected.offsetLeft;
   else if(selected.offsetLeft+selected.offsetWidth>rail.scrollLeft+rail.clientWidth)rail.scrollLeft=selected.offsetLeft+selected.offsetWidth-rail.clientWidth;
  }else{
   if(selected.offsetTop<rail.scrollTop)rail.scrollTop=selected.offsetTop;
   else if(selected.offsetTop+selected.offsetHeight>rail.scrollTop+rail.clientHeight)rail.scrollTop=selected.offsetTop+selected.offsetHeight-rail.clientHeight;
  }
 },[index,desktop,showMobileModel]);

 // Native model files belong to the separate viewer; preserve photos/videos in
 // Shopify order, including any images not present in the media connection.
 const gallery:ProductMedia[]=(p.media||[]).filter(media=>media.type!=='model');
 for(const [i,image] of p.images.entries())if(!gallery.some(media=>media.type==='image'&&media.url===image.url))gallery.push({id:`image-${i}`,type:'image',url:image.url,alt:image.altText,previewImage:image.url});
 const mainImage=p.image||p.images[0]?.url||gallery.find(media=>media.type==='image')?.url;
 if(!gallery.length)gallery.push({id:'product-image',type:'image',url:mainImage||`/images/${p.shape}-atelier.png`,alt:p.title});
 if(p.demo)gallery.push({id:'atelier-scene',type:'image',url:'/images/atelier-hero.webp',alt:'Illustrative atelier still life'});
 const selected=gallery[index]||gallery[0];
 const imageIndexes=gallery.flatMap((media,i)=>media.type==='image'?[i]:[]);
 const imageOrder=imageIndexes.join(',');
 const playing=playback==='play'||(playback==='auto'&&!reduced);
 const canAutoplay=imageIndexes.length>1&&playing&&visible&&pageActive&&!hovered&&!focused&&!showMobileModel&&selected.type==='image';
 const nextImage=gallery[imageIndexes[(imageIndexes.indexOf(index)+1)%imageIndexes.length]];
 useEffect(()=>{
  if(!canAutoplay)return;
  // Give each photo a full reading interval; skip videos so manual playback
  // cannot be interrupted. The final photograph returns to the first.
  const timer=window.setTimeout(()=>setIndex(current=>imageIndexes[(imageIndexes.indexOf(current)+1)%imageIndexes.length]),5000);
  return ()=>window.clearTimeout(timer);
 },[canAutoplay,index,imageOrder,p.id]);
 const nativeModel=p.media?.find(media=>media.type==='model'&&media.url);
 const model=nativeModel?.url||p.model;
 const modelAvailable=Boolean(p.demo||mainImage||model);
 const externalHost=(()=>{try{const host=new URL(selected.embedUrl||'').hostname;return /(^|\.)(youtube\.com|youtube-nocookie\.com|vimeo\.com)$/.test(host);}catch{return false;}})();

 function navigate(event:KeyboardEvent<HTMLDivElement>) {
  let next=index;
  if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(index+1)%gallery.length;
  else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(index-1+gallery.length)%gallery.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=gallery.length-1;
  else return;
  event.preventDefault();setMobileModel(false);setIndex(next);
  thumbs.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus({preventScroll:true});
 }

 return <div className="exhibit-gallery" aria-label={`${p.title} gallery`}>
  <span className="exhibit-edition">THE DYU ATELIER <i>/</i> A STUDY IN CARE</span>
  <div className={`product-media-split ${modelAvailable?'':'product-media-images-only'}`}>
   <div className="product-photo-panel" data-autoplay={canAutoplay?'playing':'paused'}>
    <div ref={imageGallery} className={`product-image-gallery ${gallery.length===1?'product-image-single':''}`}
     onPointerEnter={event=>{if(event.pointerType==='mouse')setHovered(true);}}
     onPointerLeave={()=>setHovered(false)}
     onPointerDownCapture={()=>setFocused(false)}
     onFocusCapture={event=>setFocused((event.target as HTMLElement).matches(':focus-visible'))}
     onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
     {gallery.length>1&&<div className="product-thumbnail-rail"><div ref={thumbs} className="gallery-thumbs" role="group" aria-label="Product media" aria-describedby={hintId} onKeyDown={navigate}>
      {gallery.map((media,i)=><button type="button" key={media.id} onClick={()=>{setMobileModel(false);setIndex(i);}} aria-controls={stageId} aria-label={`View ${media.type} ${i+1}`} aria-pressed={!showMobileModel&&index===i} tabIndex={index===i?0:-1} className={!showMobileModel&&index===i?'selected':''}>
       {media.previewImage||(media.type==='image'&&media.url)?<Image src={(media.previewImage||media.url)!} alt="" width={72} height={72} sizes="72px" loading={i===0?'eager':'lazy'}/>:<ImageIcon size={20} aria-hidden="true"/>}
       {(media.type==='video'||media.type==='externalVideo')&&<Play size={14} aria-hidden="true"/>}
      </button>)}
     </div></div>}
     <div className={`product-image-stage ${showMobileModel?'product-mobile-model-stage':''}`} id={stageId} data-media-id={showMobileModel?'product-model':selected.id}>
      {showMobileModel?<ProductVisual key={`${p.id}-mobile-model`} shape={p.shape} tone={p.tone} image={nativeModel?.previewImage||mainImage} sourceImage={!p.demo&&!model?mainImage:undefined} model={model} title={p.title} interactive eager onClose={()=>{setMobileModel(false);mobileToggle.current?.focus({preventScroll:true});}}/>:
       selected.type==='video'&&selected.url?<video key={selected.id} className="product-gallery-video" controls playsInline preload="metadata" poster={selected.previewImage} aria-label={selected.alt||`${p.title} video`} src={selected.url}/>:
       selected.type==='externalVideo'&&externalHost?<iframe key={selected.id} className="product-gallery-video" src={selected.embedUrl} title={selected.alt||`${p.title} video`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>:
       <Image key={selected.id} src={selected.type==='image'?selected.url||mainImage||`/images/${p.shape}-atelier.png`:selected.previewImage||mainImage||`/images/${p.shape}-atelier.png`} alt={selected.alt||p.title} fill sizes="(max-width: 800px) 90vw, (pointer: coarse) and (max-width: 1024px) 720px, (max-width: 1200px) 43vw, 38vw" preload={index===0} className="product-gallery-photo"/>}
     </div>
    </div>
    <div className={`product-gallery-footer ${gallery.length===1?'product-gallery-footer-single':''}`}>
     <span className="product-gallery-caption" aria-live={canAutoplay?'off':'polite'}>{showMobileModel?'Explore in 3D':<>{index+1} / {gallery.length} <i>·</i> {selected.type==='image'?'A closer look':'From the atelier, in motion'}</>}</span>
     {imageIndexes.length>1&&<button type="button" className="gallery-autoplay-toggle" aria-controls={stageId} aria-label={playing?'Pause product images':'Play product images'} onClick={()=>setPlayback(playing?'pause':'play')}>{playing?<Pause size={13} aria-hidden="true"/>:<Play size={13} aria-hidden="true"/>}<span>{playing?'Pause':'Play'}</span></button>}
     {modelAvailable&&<button ref={mobileToggle} type="button" className="gallery-model-toggle" aria-controls={stageId} aria-label={showMobileModel?'Show product photos':'View product in 3D'} aria-pressed={showMobileModel} onClick={()=>setMobileModel(value=>!value)}>{showMobileModel?<ImageIcon size={16} aria-hidden="true"/>:<Box size={16} aria-hidden="true"/>}<span>{showMobileModel?'Photos':'3D view'}</span></button>}
    </div>
    {nextImage?.url&&playing&&visible&&!showMobileModel&&imageIndexes.length>1&&<div className="product-gallery-prefetch" aria-hidden="true"><Image src={nextImage.url} alt="" width={72} height={72} sizes="(max-width: 800px) 90vw, (pointer: coarse) and (max-width: 1024px) 720px, (max-width: 1200px) 43vw, 38vw" loading="eager"/></div>}
    <span id={hintId} className="product-gallery-hint">Use the arrow keys to browse product media. Home and End select the first and last item.</span>
   </div>
   {modelAvailable&&<section className="product-model-panel" aria-label="Interactive 3D product model">
    <p className="eyebrow product-model-heading">THE OBJECT IN 3D</p>
    <div className="exhibit-stage product-model-stage">
     {desktop&&<ProductVisual key={`${p.id}-${model||mainImage}`} shape={p.shape} tone={p.tone} image={nativeModel?.previewImage||mainImage} sourceImage={!p.demo&&!model?mainImage:undefined} model={model} title={p.title} interactive eager/>}
    </div>
   </section>}
  </div>
 </div>;
}
