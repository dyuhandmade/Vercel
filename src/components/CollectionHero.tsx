'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {getImageProps} from 'next/image';
import {Component,useEffect,useId,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import {useSearchParams} from 'next/navigation';
import {ArrowLeft,ArrowRight,ArrowUpRight,RotateCcw} from 'lucide-react';
import {heroBotanical,heroBundleMembers,type HeroProduct,type HeroViewCommand} from '@/lib/hero-scene';
import {configuredHeroProduct,heroArtwork,inheritHeroContent,shopHeroHandle} from '@/lib/hero-content';
import {editableText,type ContentSection} from '@/lib/content-safety';
import {useSiteContent} from './SiteContentProvider';
import type {PhotoModelMetadata} from '@/lib/photo-model';
import './collection-hero.css';

const HeroCanvas=dynamic(()=>import('./CollectionHeroCanvas'),{ssr:false});

class SceneBoundary extends Component<{children:ReactNode;onError:()=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){this.props.onError();}
 render(){return this.state.failed?null:this.props.children;}
}

export function CollectionHeroPlaceholder(){
 const siteContent=useSiteContent();
 return <div className="collection-hero-loading" role="status"><span aria-hidden="true"/>{editableText(siteContent,'catalog-hero-loading','Preparing a little nature…')}</div>;
}

function HeroCaption({content,product}:{content:ContentSection;product?:HeroProduct}){
 const href=content.linkUrl||(product?`/products/${product.handle}`:undefined);
 const label=content.linkLabel||product?.title;
 const caption=content.caption||(product?'A STUDY IN NATURE':undefined);
 return caption||label?<figcaption className="collection-hero-caption">{caption&&<span>{caption}</span>}{href&&label?<Link href={href}>{label}<ArrowUpRight size={16} aria-hidden="true"/></Link>:label?<span>{label}</span>:null}</figcaption>:null;
}

function ProductScene({product,members,content}:{product:HeroProduct;members:HeroProduct[];content:ContentSection}){
 const siteContent=useSiteContent();
 const t=(key:string,fallback:string)=>editableText(siteContent,key,fallback);
 const figure=useRef<HTMLElement>(null);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const [visible,setVisible]=useState(false),[pageVisible,setPageVisible]=useState(true),[reduced,setReduced]=useState(false);
 const [metadata,setMetadata]=useState<PhotoModelMetadata>();
 const [command,setCommand]=useState<HeroViewCommand>(),[dragging,setDragging]=useState(false);
 const hintId=useId();
 const turn=(action:HeroViewCommand['action'])=>setCommand(previous=>({id:(previous?.id||0)+1,action}));
 const keyboard=(event:KeyboardEvent<HTMLDivElement>)=>{
  if(!ready||failed||event.target!==event.currentTarget)return;
  const keys:Record<string,HeroViewCommand['action']>={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Home:'reset'};
  const action=keys[event.key];
  if(action){event.preventDefault();turn(action);}
 };
 const botanical=heroBotanical(product);
 useEffect(()=>{
  const element=figure.current;if(!element)return;
  const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'80px'});
  observer.observe(element);
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const syncMotion=()=>setReduced(motion.matches),syncPage=()=>setPageVisible(!document.hidden);
  syncMotion();syncPage();motion.addEventListener('change',syncMotion);document.addEventListener('visibilitychange',syncPage);
  return()=>{observer.disconnect();motion.removeEventListener('change',syncMotion);document.removeEventListener('visibilitychange',syncPage);};
 },[]);
 useEffect(()=>{
  if(ready||failed)return;
  const timeout=window.setTimeout(()=>setFailed(true),30000);
  return()=>window.clearTimeout(timeout);
 },[ready,failed,attempt]);
 const moving=visible&&pageVisible&&!reduced&&!failed;
 return <figure ref={figure} className="collection-hero" aria-label={`${product.title}, a botanical sculpture`}
  data-product={product.handle} data-botanical={botanical} data-shape={product.shape}
  data-ready={ready&&!failed} data-dragging={dragging} data-disc-motion={moving?'rotating':'still'} data-product-motion="stationary"
  data-model-construction={metadata?.construction} data-model-parts={metadata?.partKinds?.join(',')}>
  <div className="collection-hero-stage" aria-busy={!ready&&!failed} role="group" aria-label="Interactive 3D product display"
   tabIndex={ready&&!failed?0:-1} aria-describedby={ready&&!failed?hintId:undefined} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home" onKeyDown={keyboard}>
   {!failed&&<SceneBoundary key={attempt} onError={()=>setFailed(true)}>
    <HeroCanvas product={product} members={members} botanical={botanical} moving={moving} command={command} onDragChange={setDragging} onReady={()=>setReady(true)} onUnavailable={()=>setFailed(true)} onMetadata={setMetadata}/>
   </SceneBoundary>}
   {!ready&&!failed&&<CollectionHeroPlaceholder/>}
   {failed&&<div className="collection-hero-unavailable" role="status"><p>{t('catalog-hero-unavailable','The 3D display couldn’t load.')}</p><button type="button" onClick={()=>{setReady(false);setFailed(false);setAttempt(value=>value+1);}}><RotateCcw size={15}/>{t('catalog-hero-retry','Try again')}</button></div>}
  </div>
  {ready&&!failed&&<div className="collection-hero-controls" role="group" aria-label="3D view controls">
   <span id={hintId}>{t('catalog-hero-drag','Drag to rotate')}<span className="sr-only">. Use arrow keys to turn and Home to reset.</span></span>
   <button type="button" aria-label="Rotate scene left" title="Rotate left" onClick={()=>turn('left')}><ArrowLeft size={16}/></button>
   <button type="button" aria-label="Rotate scene right" title="Rotate right" onClick={()=>turn('right')}><ArrowRight size={16}/></button>
   <button type="button" aria-label="Reset 3D view" title="Reset view" onClick={()=>turn('reset')}><RotateCcw size={16}/></button>
  </div>}
  <HeroCaption content={content} product={product}/>
 </figure>;
}

export default function CollectionHero({products,content={handle:'shop-hero'},typeContent={},nativeImage}:{products:HeroProduct[];content?:ContentSection;typeContent?:Record<string,ContentSection>;nativeImage?:{url:string;altText?:string}}){
 const params=useSearchParams();
 const type=params.get('type');
 const configured=inheritHeroContent(content,type?typeContent[shopHeroHandle(type)]:undefined);
 const product=configuredHeroProduct(products,configured,type);
 if(configured.enabled===false)return null;
 const artwork=heroArtwork(configured,product,nativeImage);
 if(artwork){
  const imageProps={alt:artwork.alt,fill:true,sizes:'(max-width: 800px) 88vw, 45vw',fetchPriority:'high' as const};
  const {props:desktop}=getImageProps({...imageProps,src:artwork.image});
  const {props:mobile}=getImageProps({...imageProps,src:artwork.mobileImage});
  return <figure className="collection-hero collection-hero-image" data-display="image">
   <picture className="collection-hero-artwork"><source media="(max-width: 540px)" srcSet={mobile.srcSet} sizes="88vw"/><img {...desktop} style={{...desktop.style,objectFit:'cover',objectPosition:artwork.position}}/></picture>
   <HeroCaption content={configured} product={product}/>
  </figure>;
 }
 return product?<ProductScene key={product.id} product={product} members={heroBundleMembers(product,products)} content={configured}/>:null;
}
