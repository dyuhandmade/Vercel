'use client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {Component,type ReactNode,type CSSProperties,useEffect,useRef,useState} from 'react';
import { Box, RotateCcw, RotateCw, X } from 'lucide-react';
import type {PhotoModelMetadata} from '@/lib/photo-model';
import './product-visual.css';
const ModelCanvas=dynamic(()=>import('./ModelCanvas'),{ssr:false});
class ModelBoundary extends Component<{children:ReactNode;fallback:ReactNode;onError:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onError();}render(){return this.state.failed?this.props.fallback:this.props.children;}}
export default function ProductVisual({shape='jar',tone=shape==='soap'?'#9b9c74':'#95602f',image,sourceImage,model,title='DYUhandmade illustrative product',interactive=false,ensemble=false,eager=false}:{shape?:string;tone?:string;image?:string;sourceImage?:string;model?:string;title?:string;interactive?:boolean;ensemble?:boolean;eager?:boolean}){
 const [active,setActive]=useState(eager);const [rotation,setRotation]=useState(sourceImage&&!model?.14:0);const [failed,setFailed]=useState(false);const [attempt,setAttempt]=useState(0);const [ready,setReady]=useState(false);
 const [photoMetadata,setPhotoMetadata]=useState<PhotoModelMetadata>();
 const primary=useRef<HTMLButtonElement>(null),focusControls=useRef(false),restoreFocus=useRef(false);
 const open=()=>{focusControls.current=true;setReady(false);setFailed(false);setPhotoMetadata(undefined);setRotation(sourceImage&&!model?.14:0);setAttempt(a=>a+1);setActive(true);};
 const close=()=>{restoreFocus.current=true;setActive(false);setReady(false);setFailed(false);};
 useEffect(()=>{
  if(active&&(ready||failed)&&focusControls.current){primary.current?.focus({preventScroll:true});focusControls.current=false;}
  if(!active&&restoreFocus.current){primary.current?.focus({preventScroll:true});restoreFocus.current=false;}
 },[active,ready,failed]);
 const poster=<Image src={image||`/images/${shape}-atelier.png`} alt={title} fill sizes={ensemble?'(max-width: 800px) 100vw, 65vw':'(max-width: 700px) 90vw, 40vw'} className={image?'visual-photo':'visual-model'} priority={ensemble}/>;
 return <div className={`product-visual ${ensemble?'ensemble':''}`} data-view={active&&!failed?'3d':'image'} data-model-ready={ready||undefined} data-model-kind={active&&!failed?photoMetadata?.kind:undefined} data-model-construction={active&&!failed?photoMetadata?.construction:undefined} data-model-parts={active&&!failed?photoMetadata?.parts:undefined} data-model-part-kinds={active&&!failed?photoMetadata?.partKinds?.join(','):undefined} style={{'--product-tone':tone} as CSSProperties} role={interactive?'group':undefined} aria-label={interactive?title:undefined}>
  {(!active||failed)&&poster}
  {active&&!failed&&<>
   {!ready&&<div aria-hidden="true" style={{position:'absolute',inset:0,opacity:.55}}>{poster}</div>}
   <div className="model-render-layer" style={{position:'absolute',inset:sourceImage&&!model?'0 0 83px':0,opacity:ready?1:0}} aria-hidden={!ready}>
    <ModelBoundary key={attempt} onError={()=>setFailed(true)} fallback={null}><ModelCanvas shape={shape} tone={tone} sourceImage={sourceImage} model={model} ensemble={ensemble} rotation={rotation} label={`Interactive ${sourceImage&&!model?'image-derived ':''}3D view of ${title}`} onMetadata={setPhotoMetadata} onReady={()=>setReady(true)} onUnavailable={()=>setFailed(true)}/></ModelBoundary>
   </div>
   {!ready&&<div className="model-loading" role="status" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:11}}><span className="model-loading-mark" aria-hidden="true"/><span>{sourceImage&&!model?'Shaping the view from the photograph…':'Preparing your 3D view…'}</span></div>}
  </>}
  {active&&failed&&<span className="model-note" role="status">3D is unavailable right now. The product image is still here to explore.</span>}
  {active&&ready&&!failed&&photoMetadata&&<span className="photo-model-caption">{photoMetadata.kind==='relief'?'Photographic relief · Depth interpreted from one image':'Image-derived 3D · Unseen surfaces approximated'}</span>}
  {interactive&&<div className="viewer-controls" role="group" aria-label="3D view controls">{!active?<button ref={primary} type="button" className="viewer-toggle" onClick={open}><Box size={17} aria-hidden="true"/> Explore in 3D</button>:<>
   {failed?<button ref={primary} type="button" className="viewer-toggle" onClick={open}><RotateCcw size={17} aria-hidden="true"/> Retry 3D</button>:<><span className="drag-hint">{ready?'Drag to turn':'Opening…'}</span><button ref={primary} type="button" aria-label="Rotate product left" title="Rotate left" disabled={!ready} onClick={()=>setRotation(r=>r-.4)}><RotateCcw size={17} aria-hidden="true"/></button><button type="button" aria-label="Rotate product right" title="Rotate right" disabled={!ready} onClick={()=>setRotation(r=>r+.4)}><RotateCw size={17} aria-hidden="true"/></button></>}
   <button type="button" aria-label="Close 3D view" title="Return to image" onClick={close}><X size={17} aria-hidden="true"/></button>
  </>}</div>}
 </div>;
}


