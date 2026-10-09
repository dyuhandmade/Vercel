'use client';

import {useEffect,useId,useRef,useState,type KeyboardEvent,type PointerEvent} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {AnimatePresence,motion,useInView,useMotionTemplate,useMotionValue,useSpring,useTransform} from 'motion/react';
import {ArrowLeft,ArrowRight,Check,Leaf} from 'lucide-react';
import type {SiteContent} from '@/lib/site-content';
import {useReducedMotionPreference} from '@/lib/use-reduced-motion';
import {configuredRitualMoments} from './ritual-moments';
import styles from './RitualMomentExperience.module.css';

type Props={content?:SiteContent;destinationHref?:string;destinationLabel?:string};

export default function RitualMomentExperience(props:Props){
 const moments=configuredRitualMoments(props.content);
 if(!moments.length||props.content?.sections.ritual?.enabled===false)return null;
 return <RitualMomentScene {...props} moments={moments}/>;
}

function RitualMomentScene({content,destinationHref='/shop',destinationLabel='Find your ritual',moments}:Props&{moments:ReturnType<typeof configuredRitualMoments>}){
 const introduction=content?.sections.ritual;
 const labels=content?.sections['ritual-interface'];
 const [selectedMoment,setMomentIndex]=useState(0);
 const momentIndex=Math.min(selectedMoment,moments.length-1);
 const [selectedStep,setStep]=useState(0);
 const step=Math.min(selectedStep,moments[momentIndex].steps.length-1);
 const uid=useId();
 const reduced=useReducedMotionPreference();
 const root=useRef<HTMLDivElement>(null);
 const entered=useInView(root,{once:true,amount:.12});
 const inView=useInView(root,{amount:.05});
 const [pageVisible,setPageVisible]=useState(true);
 const pointerX=useMotionValue(0),pointerY=useMotionValue(0);
 const smoothX=useSpring(pointerX,{stiffness:85,damping:23});
 const smoothY=useSpring(pointerY,{stiffness:85,damping:23});
 const rotateX=useTransform(smoothY,[-.5,.5],[1.6,-1.6]);
 const rotateY=useTransform(smoothX,[-.5,.5],[-2.2,2.2]);
 const imageX=useTransform(smoothX,[-.5,.5],[7,-7]);
 const imageY=useTransform(smoothY,[-.5,.5],[7,-7]);
 const glowX=useSpring(50,{stiffness:90,damping:25}),glowY=useSpring(35,{stiffness:90,damping:25});
 const glow=useMotionTemplate`radial-gradient(380px circle at ${glowX}% ${glowY}%, rgba(255,255,238,.48), transparent 75%)`;
 const stepButtons=useRef<(HTMLButtonElement|null)[]>([]);
 const momentButtons=useRef<(HTMLButtonElement|null)[]>([]);
 const finalLink=useRef<HTMLAnchorElement>(null);
 const focusFinal=useRef(false);
 const moment=moments[momentIndex];
 const current=moment.steps[step];
 const lastStep=moment.steps.length-1;
 const isLast=step===lastStep;
 const photo=current.image||moment.image;
 const mobilePhoto=current.mobileImage||(!current.image?moment.mobileImage:undefined);
 const Icon=moment.icon;
 const number=(n:number)=>String(n).padStart(2,'0');

 function movePhoto(event:PointerEvent<HTMLElement>){
  if(reduced||event.pointerType!=='mouse')return;
  const bounds=event.currentTarget.getBoundingClientRect();
  pointerX.set((event.clientX-bounds.left)/bounds.width-.5);
  pointerY.set((event.clientY-bounds.top)/bounds.height-.5);
 }
 function resetPhoto(){pointerX.set(0);pointerY.set(0);}
 function moveGlow(event:PointerEvent<HTMLDivElement>){
  if(reduced||event.pointerType!=='mouse')return;
  const bounds=event.currentTarget.getBoundingClientRect();
  glowX.set((event.clientX-bounds.left)/bounds.width*100);
  glowY.set((event.clientY-bounds.top)/bounds.height*100);
 }
 useEffect(()=>{
  const update=()=>setPageVisible(!document.hidden);
  update();document.addEventListener('visibilitychange',update);
  return()=>document.removeEventListener('visibilitychange',update);
 },[]);
 useEffect(()=>{if(reduced||!inView||!pageVisible){pointerX.set(0);pointerY.set(0);}},[reduced,inView,pageVisible,pointerX,pointerY]);

 function chooseMoment(index:number,focus=false){setMomentIndex(index);setStep(0);focusFinal.current=false;if(focus)momentButtons.current[index]?.focus({preventScroll:true});}
 function keyboardIndex(event:KeyboardEvent<HTMLButtonElement>,index:number,count:number){
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return null;
  event.preventDefault();
  return event.key==='Home'?0:event.key==='End'?count-1:(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+count)%count;
 }
 function next(){focusFinal.current=step===lastStep-1;setStep(Math.min(lastStep,step+1));}
 useEffect(()=>{if(isLast&&focusFinal.current){finalLink.current?.focus({preventScroll:true});focusFinal.current=false;}},[isLast]);

 return <div ref={root} className={styles.root} data-testid="ritual-moments" data-motion={reduced?'still':'active'} data-in-view={inView&&pageVisible}>
  <motion.header className={styles.heading} initial={false} animate={{opacity:reduced||entered?1:0,y:reduced||entered?0:18}} transition={{duration:reduced?0:.65,ease:[.22,.7,.3,1]}}>
   <div><p className={styles.eyebrow}>{introduction?.eyebrow||'THE NEXT CHAPTER / YOU'}</p><h2>{introduction?.title||'A little time.'}<br/><em>{introduction?.titleEmphasis||'Entirely yours.'}</em></h2></div>
   <div className={styles.headingNote}><span className={styles.headingMark} aria-hidden="true"><Leaf size={25} strokeWidth={1}/></span><p>{introduction?.body||'Choose the moment. Find your own rhythm.'}</p></div>
  </motion.header>

  <motion.div className={styles.experience} data-moment={moment.id} data-testid="ritual-scene" initial={false} animate={{opacity:reduced||entered?1:0,y:reduced||entered?0:30}} transition={{duration:reduced?0:.8,delay:reduced?0:.1,ease:[.22,.7,.3,1]}}>
   <motion.figure className={styles.photograph} data-testid="ritual-photo" onPointerMove={movePhoto} onPointerLeave={resetPhoto} onPointerCancel={resetPhoto} style={{rotateX:reduced?0:rotateX,rotateY:reduced?0:rotateY,transformPerspective:1200}}>
    <AnimatePresence initial={false}>
     <motion.div className={styles.photoLayer} key={photo} initial={{opacity:0,scale:reduced?1:1.06}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={{duration:reduced?0:.7,ease:[.22,.7,.3,1]}}>
      <motion.div className={styles.photoDepth} style={{x:reduced?0:imageX,y:reduced?0:imageY}}><div className={styles.photoDrift}>
       <picture>{mobilePhoto&&<source media="(max-width: 760px)" srcSet={mobilePhoto}/>}<Image src={photo} alt={current.imageAlt||moment.imageAlt} fill sizes="(max-width:760px) 94vw, (max-width:1400px) 48vw, 680px" style={{objectPosition:current.imagePosition||moment.position}}/></picture>
      </div></motion.div>
     </motion.div>
    </AnimatePresence>
    <div className={styles.photoShade}/>
    <span className={styles.lightSweep} data-testid="ritual-light" aria-hidden="true"/>
    <div className={styles.photoTop}><span className={styles.photoLabel}>{introduction?.caption||'THE ART OF THE EVERYDAY'}</span><span className={styles.photoIndex}>{number(momentIndex+1)} / {number(moments.length)}</span></div>
    <div className={styles.dial} aria-hidden="true">
     <svg viewBox="0 0 100 100"><circle className={styles.dialTrack} cx="50" cy="50" r="44"/><motion.circle className={styles.dialProgress} cx="50" cy="50" r="44" pathLength="1" strokeDasharray="1" initial={false} animate={{strokeDashoffset:1-(step+1)/moment.steps.length}} transition={{duration:reduced?0:.6}}/></svg>
     <Icon size={34} strokeWidth={1}/>
    </div>
    <motion.figcaption key={moment.id} className={styles.photoCaption} initial={reduced?false:{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.6,delay:reduced?0:.1}}><span>{moment.caption||labels?.caption||'MAKE SPACE FOR'}</span><strong>{moment.label}<i>.</i></strong><p>{moment.note}</p></motion.figcaption>
    <span className={styles.photoFootnote}>{moment.footnote||labels?.body||'A small ritual. A beautiful ordinary day.'}</span>
   </motion.figure>

   <div className={styles.card} onPointerMove={moveGlow} onPointerLeave={()=>{glowX.set(50);glowY.set(35);}}>
    <motion.div className={styles.cardGlow} style={{background:glow,opacity:reduced?0:1}} aria-hidden="true"/>
    <div className={styles.cardTop}><span className={styles.eyebrow}>{labels?.eyebrow||'YOUR MOMENT, YOUR RHYTHM'}</span><span className={styles.activeDot} aria-hidden="true"/></div>
    <div className={styles.moments} role="group" aria-label="Choose your moment">
     {moments.map((option,index)=>{const TabIcon=option.icon;return <button type="button" key={option.id} ref={node=>{momentButtons.current[index]=node;}} aria-pressed={momentIndex===index} onClick={()=>chooseMoment(index)} onKeyDown={event=>{const target=keyboardIndex(event,index,moments.length);if(target!==null)chooseMoment(target,true);}}>
      {momentIndex===index&&<motion.span className={styles.momentHighlight} layoutId={`${uid}-moment`} transition={reduced?{duration:0}:{type:'spring',stiffness:280,damping:30}}/>}
      <TabIcon size={21} strokeWidth={1.2}/><span>{option.label}</span>
     </button>})}
    </div>

    <div className={styles.progress} role="tablist" aria-label="Explore your ritual steps">
     {moment.steps.map((item,index)=><button type="button" role="tab" key={index} ref={node=>{stepButtons.current[index]=node;}} id={`${uid}-tab-${index}`} aria-controls={`${uid}-step`} aria-label={`Step ${index+1}: ${item.title}`} aria-selected={step===index} tabIndex={step===index?0:-1} data-complete={index<step} onClick={()=>setStep(index)} onKeyDown={event=>{const target=keyboardIndex(event,index,moment.steps.length);if(target!==null){setStep(target);stepButtons.current[target]?.focus({preventScroll:true});}}}><span className={styles.stepCircle}>{index<step?<Check size={14} aria-hidden="true"/>:number(index+1)}</span><span className={styles.stepLine} aria-hidden="true"/></button>)}
    </div>

    <div className={styles.panel} role="tabpanel" id={`${uid}-step`} aria-labelledby={`${uid}-tab-${step}`} tabIndex={0} aria-live="polite" aria-atomic="true">
     <motion.span key={`${moment.id}-${step}-number`} className={styles.ghostNumber} aria-hidden="true" initial={reduced?false:{opacity:0,y:12,rotate:6}} animate={{opacity:1,y:0,rotate:0}} transition={{duration:reduced?0:.55}}>{number(step+1)}</motion.span>
     <motion.div key={`${moment.id}-${step}`} className={styles.stepCopy} initial={reduced?false:{opacity:0,y:12,filter:'blur(3px)'}} animate={{opacity:1,y:0,filter:'blur(0px)'}} transition={{duration:reduced?0:.4}}>
      <span className={styles.stepEyebrow}>{moment.label} / {step+1} OF {moment.steps.length}</span>
      <h3>{current.title}</h3><p>{current.text}</p>
      {isLast&&<motion.div className={styles.handoff} initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.45,delay:reduced?0:.15}}><Leaf size={18} strokeWidth={1.2}/><span>{labels?.title||'A ritual to call your own.'}<small>{labels?.titleEmphasis||'Find a little everyday care in the collection.'}</small></span></motion.div>}
     </motion.div>
    </div>

    <div className={styles.controls}>
     <button type="button" className={styles.back} aria-label="Previous ritual step" aria-controls={`${uid}-step`} disabled={step===0} onClick={()=>setStep(Math.max(0,step-1))}><ArrowLeft size={19}/></button>
     {!isLast?<button type="button" className={styles.next} aria-controls={`${uid}-step`} onClick={next}>{labels?.linkLabel||'Take a moment'}<span><ArrowRight size={19}/></span></button>:<Link ref={finalLink} className={styles.next} href={introduction?.linkUrl||destinationHref}>{introduction?.linkLabel||destinationLabel}<span><ArrowRight size={19}/></span></Link>}
    </div>
    <div className={styles.cardFootnote}><span className={styles.fineLine}/><span>{labels?.note||'NOTHING TO RUSH. A LITTLE TIME TO BE.'}</span></div>
   </div>
  </motion.div>
  <p className={styles.imageNote}>{introduction?.note||'Illustrative scenes · The world of DYUhandmade'}</p>
 </div>;
}
