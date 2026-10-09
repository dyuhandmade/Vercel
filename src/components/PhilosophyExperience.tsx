'use client';

import {useId,useRef,useState,type KeyboardEvent,type PointerEvent} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,ArrowUpRight,Leaf,Hand,Sun} from 'lucide-react';
import {AnimatePresence,motion,useMotionValue,useSpring} from 'motion/react';
import {useReducedMotionPreference} from '@/lib/use-reduced-motion';
import type {SiteContent} from '@/lib/site-content';
import styles from './PhilosophyExperience.module.css';

const defaultPerspectives=[
 {handle:'philosophy-nature',word:'Nature.',label:'Nature',image:'/images/botanical-study.webp',position:'center 44%',alt:'Illustrative botanical study with flowers, leaves, and natural textures',line:'There is a whole world in the smallest detail.',link:'/ingredients',action:'Meet the botanicals',note:'A world worth looking closer at',detail:'Follow your curiosity',icon:Leaf},
 {handle:'philosophy-human-touch',word:'Human touch.',label:'Human touch',image:'/images/atelier-craft-v2.webp',position:'center',alt:'Illustrative atelier scene exploring the care and detail of making',line:'The things we choose can invite us to notice the hands behind them.',link:'/how-its-made',action:'Follow the making',note:'The beauty is in the attention',detail:'Care in every detail',icon:Hand},
 {handle:'philosophy-everyday',word:'Your everyday.',label:'Your everyday',image:'/images/atelier-ritual-v2.webp',position:'center',alt:'Illustrative everyday ritual with warm light and botanical care objects',line:'A familiar moment can become a little time that belongs to you.',link:'/shop',action:'Find your ritual',note:'The story continues with you',detail:'Make the moment yours',icon:Sun}
];

export default function PhilosophyExperience({content}:{content?:SiteContent}){
 const introduction=content?.sections.philosophy;
 const perspectives=defaultPerspectives.filter(item=>content?.sections[item.handle]?.enabled!==false).sort((a,b)=>(content?.sections[a.handle]?.sortOrder??0)-(content?.sections[b.handle]?.sortOrder??0)).map(item=>{
  const saved=content?.sections[item.handle];
  return {...item,word:saved?.title||item.word,label:saved?.caption||item.label,image:saved?.image||item.image,mobileImage:saved?.mobileImage,position:saved?.imagePosition||item.position,alt:saved?.imageAlt||item.alt,line:saved?.body||item.line,link:saved?.linkUrl||item.link,action:saved?.linkLabel||item.action,note:saved?.note||item.note,detail:saved?.secondaryLabel||item.detail};
 });
 const [selected,setSelected]=useState(0);
 const reduced=useReducedMotionPreference();
 const id=useId();
 const buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const tiltX=useMotionValue(0),tiltY=useMotionValue(0);
 const rotateX=useSpring(tiltX,{stiffness:130,damping:22}),rotateY=useSpring(tiltY,{stiffness:130,damping:22});
 const index=Math.min(selected,perspectives.length-1);
 const current=perspectives[index];
 const number=(value:number)=>String(value).padStart(2,'0');
 function choose(next:number,focus=false){
  const target=(next+perspectives.length)%perspectives.length;
  setSelected(target);
  if(focus)buttons.current[target]?.focus({preventScroll:true});
 }
 function navigate(event:KeyboardEvent<HTMLButtonElement>,position:number){
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  choose(event.key==='Home'?0:event.key==='End'?perspectives.length-1:position+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1),true);
 }
 function move(event:PointerEvent<HTMLDivElement>){
  if(reduced||event.pointerType!=='mouse')return;
  const bounds=event.currentTarget.getBoundingClientRect();
  tiltX.set((.5-(event.clientY-bounds.top)/bounds.height)*5);
  tiltY.set(((event.clientX-bounds.left)/bounds.width-.5)*7);
 }
 function resetTilt(){tiltX.set(0);tiltY.set(0);}
 if(!current||introduction?.enabled===false)return null;
 const Icon=current.icon;
 const heading=introduction?.title?.trim()||'Our philosophy.';
 const standardHeading=!introduction?.title&&!introduction?.titleEmphasis;

 return <section className={styles.root} aria-labelledby={`${id}-heading`} data-testid="home-philosophy">
  <div className={styles.ambient} aria-hidden="true"/>
  <div className={styles.layout}>
   <div className={styles.copy}>
    <span className={styles.eyebrow}>{introduction?.eyebrow||'THE DYU WAY'}</span>
    <h2 id={`${id}-heading`} className={styles.heading}>{standardHeading?<>Our <em>philosophy.</em></>:<>{heading}{introduction?.titleEmphasis&&<> <em>{introduction.titleEmphasis}</em></>}</>}</h2>
    <p className={styles.introduction}>{introduction?.body||'A little nature. A human touch. A more considered everyday.'}</p>
    <div className={styles.tabs} role="tablist" aria-label="Explore our philosophy" aria-orientation="vertical">
     {perspectives.map((perspective,position)=>{
      const TabIcon=perspective.icon;
      return <button type="button" role="tab" key={perspective.handle} className={styles.tab}
       ref={node=>{buttons.current[position]=node;}} id={`${id}-tab-${position}`} aria-label={perspective.label}
       aria-selected={index===position} aria-controls={`${id}-panel`} tabIndex={index===position?0:-1}
       onClick={()=>choose(position)} onKeyDown={event=>navigate(event,position)}>
       {index===position&&<motion.span className={styles.selection} layoutId={`${id}-selection`} transition={reduced?{duration:0}:{type:'spring',stiffness:300,damping:32}}/>}
       <span className={styles.tabIcon}><TabIcon size={22} strokeWidth={1.15}/></span>
       <span className={styles.tabText}><span>{perspective.word}</span><small>{perspective.detail}</small></span>
       <span className={styles.tabNumber}>{number(position+1)}</span><ArrowUpRight className={styles.tabArrow} size={19} strokeWidth={1.35}/>
      </button>;
     })}
    </div>
    <div className={styles.navigation}>
     <div className={styles.controls}><button type="button" aria-label="Previous philosophy chapter" onClick={()=>choose(index-1)}><ArrowLeft size={18}/></button><span aria-label={`Chapter ${index+1} of ${perspectives.length}`}>{number(index+1)}<i>/ {number(perspectives.length)}</i></span><button type="button" aria-label="Next philosophy chapter" onClick={()=>choose(index+1)}><ArrowRight size={18}/></button></div>
     <Link href={introduction?.linkUrl||'/our-story'} className={styles.storyLink}>{introduction?.linkLabel||'The story behind DYU'} <ArrowUpRight size={16}/></Link>
    </div>
   </div>
   <div className={styles.panel} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${index}`} tabIndex={0}>
    <div className={styles.stage} onPointerMove={move} onPointerLeave={resetTilt}>
     <div className={styles.orbit} aria-hidden="true"/>
     <motion.div className={styles.deck} style={{rotateX:reduced?0:rotateX,rotateY:reduced?0:rotateY,transformPerspective:1100}}>
      <span className={styles.backSheet} aria-hidden="true"/>
      <span className={styles.middleSheet} aria-hidden="true"/>
      <div className={styles.photograph}>
       <AnimatePresence initial={false}>
        <motion.div key={current.image} className={styles.photoLayer} initial={{opacity:0,scale:reduced?1:1.045}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={{duration:reduced?0:.65,ease:[.22,.7,.3,1]}}>
         <picture>{current.mobileImage&&<source media="(max-width: 760px)" srcSet={current.mobileImage}/>}<Image src={current.image} alt={current.alt} fill sizes="(max-width:760px) 86vw, (max-width:1100px) 46vw, 650px" style={{objectPosition:current.position}}/></picture>
        </motion.div>
       </AnimatePresence>
       <span className={styles.photoNumber} aria-hidden="true">{number(index+1)}</span>
      </div>
     </motion.div>
     <div className={styles.seal} aria-hidden="true"><Icon size={26} strokeWidth={1}/><span style={{whiteSpace:'pre-line'}}>{introduction?.caption||'A LITTLE\nCLOSER'}</span></div>
     <div className={styles.note} key={current.handle}>
      <span className={styles.noteLabel}>{current.note}</span>
      <p aria-live="polite">{current.line}</p>
      <Link href={current.link}>{current.action}<span><ArrowUpRight size={18} strokeWidth={1.3}/></span></Link>
     </div>
    </div>
    <p className={styles.footnote}>{introduction?.note||'Illustrative scenes · The world of DYUhandmade'}</p>
   </div>
  </div>
 </section>;
}
