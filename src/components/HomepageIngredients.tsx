'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useId,useRef,useState,type KeyboardEvent,type PointerEvent} from 'react';
import {AnimatePresence,motion,useMotionValue,useSpring} from 'motion/react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Leaf,MoveUpRight} from 'lucide-react';
import type {Product,StoryItem} from '@/lib/types';
import type {ContentSection} from '@/lib/site-content';
import {useReducedMotionPreference} from '@/lib/use-reduced-motion';
import styles from './HomepageIngredients.module.css';

export type HomepageIngredient=StoryItem&{mobileImage?:string;imageAlt?:string;imagePosition?:string;relatedProductHandles?:string[]};
type Props={items:HomepageIngredient[];products?:Product[];content?:ContentSection;labels?:ContentSection};
const normalize=(value:string)=>value.trim().toLocaleLowerCase();
const slug=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export default function HomepageIngredients({items,products=[],content,labels}:Props){
 const id=useId();
 const [selection,setSelection]=useState(0);
 const selected=Math.min(selection,items.length-1);
 const current=items[selected];
 const tabs=useRef<(HTMLButtonElement|null)[]>([]);
 const reduced=useReducedMotionPreference();
 const tiltX=useMotionValue(0),tiltY=useMotionValue(0);
 const rotateX=useSpring(tiltX,{stiffness:100,damping:22}),rotateY=useSpring(tiltY,{stiffness:100,damping:22});
 const related=products.filter(product=>current.relatedProductHandles?current.relatedProductHandles.includes(product.handle):product.ingredients.some(item=>(item.handle&&item.handle===current.handle)||normalize(item.name)===normalize(current.name)));
 const featured=related.find(product=>product.image||product.images[0]?.url);
 const image=current.image||content?.image||featured?.image||featured?.images[0]?.url||'/images/botanical-study.webp';
 const mobileImage=current.mobileImage||(!current.image?content?.mobileImage:undefined);
 const isProduct=!current.image&&!content?.image&&!!featured;
 const isIllustrative=!current.image&&!content?.image&&!featured;
 const ingredientHref=`/ingredients/${encodeURIComponent(current.handle||slug(current.name)||current.name)}`;
 const number=String(selected+1).padStart(2,'0');

 function select(index:number,focus=false){
  const next=(index+items.length)%items.length;
  setSelection(next);tiltX.set(0);tiltY.set(0);
  if(focus){tabs.current[next]?.focus({preventScroll:true});tabs.current[next]?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
 }
 function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number){
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  select(event.key==='Home'?0:event.key==='End'?items.length-1:index+(event.key==='ArrowLeft'?-1:1),true);
 }
 function move(event:PointerEvent<HTMLDivElement>){
  if(reduced||event.pointerType!=='mouse')return;
  const bounds=event.currentTarget.getBoundingClientRect();
  tiltX.set(-((event.clientY-bounds.top)/bounds.height-.5)*7);
  tiltY.set(((event.clientX-bounds.left)/bounds.width-.5)*8);
 }

 return <div className={styles.root} data-testid="home-ingredients">
  <header className={styles.heading}>
   <div><p className={styles.eyebrow}>{content?.eyebrow||'LOOK WITHIN / THE INGREDIENT STORY'}</p><h2>{content?.title||'Every detail.'}<br/><em>{content?.titleEmphasis||'Worth knowing.'}</em></h2></div>
   <div className={styles.introduction}><span className={styles.headingIcon} aria-hidden="true"><Leaf size={28} strokeWidth={1}/></span><p>{content?.body||'Choose an ingredient to discover its story.'}</p><span className={styles.count}>{labels?.body||`${items.length} ingredients. A little more to discover.`}</span></div>
  </header>

  <div className={styles.tabs} role="tablist" aria-label="Explore ingredients">
   {items.map((item,index)=><button type="button" role="tab" id={`${id}-tab-${index}`} aria-selected={selected===index} aria-controls={`${id}-panel`} tabIndex={selected===index?0:-1} className={styles.tab} key={item.handle||item.name} ref={node=>{tabs.current[index]=node;}} onClick={()=>select(index)} onKeyDown={event=>navigate(event,index)}>
    {selected===index&&<motion.span className={styles.tabHighlight} layoutId={`${id}-active-ingredient`} transition={reduced?{duration:0}:{type:'spring',stiffness:340,damping:34}}/>}
    <span className={styles.tabIndex}>{String(index+1).padStart(2,'0')}</span><span>{item.name}</span>
   </button>)}
  </div>

  <div className={styles.experience} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${selected}`} tabIndex={0} data-testid="home-ingredient-panel">
   <div className={styles.visual} onPointerMove={move} onPointerLeave={()=>{tiltX.set(0);tiltY.set(0);}}>
    <div className={styles.visualTop}><span>{content?.caption||'THE INGREDIENT EDIT'}</span><span>{number} / {String(items.length).padStart(2,'0')}</span></div>
    <div className={styles.aura} aria-hidden="true"/>
    <div className={styles.orbit} aria-hidden="true"/>
    <div className={styles.orbitSmall} aria-hidden="true"/>
    <motion.div className={styles.stage} style={{rotateX:reduced?0:rotateX,rotateY:reduced?0:rotateY,transformPerspective:1100}}>
     <div className={styles.plinth} aria-hidden="true"/>
     <AnimatePresence mode="wait" initial={false}>
      <motion.div className={`${styles.imageFrame} ${isProduct?styles.productImage:styles.botanicalImage}`} key={`${image}-${current.name}`} style={{z:34}} initial={{opacity:0,y:reduced?0:12,scale:reduced?1:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:reduced?0:-8}} transition={{duration:reduced?0:.35,ease:[.22,1,.36,1]}}>
       <picture>{mobileImage&&<source media="(max-width: 760px)" srcSet={mobileImage}/>}<Image src={image} alt={current.imageAlt||(!current.image&&content?.image?content.imageAlt||current.name:isProduct?featured!.title:isIllustrative?'Illustrative botanical still life':current.name)} fill sizes="(max-width: 760px) 84vw, (max-width: 1400px) 44vw, 640px" style={{objectPosition:current.imagePosition||(!current.image&&content?.image?content.imagePosition:undefined)}}/></picture>
      </motion.div>
     </AnimatePresence>
     <span className={styles.floatingSeal} aria-hidden="true"><Leaf size={21} strokeWidth={1}/><span style={{whiteSpace:'pre-line'}}>{labels?.caption||'A CLOSER\nLOOK'}</span></span>
    </motion.div>
    <div className={styles.visualBottom}><span className={styles.imageLabel}>{labels?.category||(isProduct?'From the collection':isIllustrative?'Illustrative botanical study':'Ingredient photograph')}</span><span className={styles.signature}>{labels?.note||'Nature, in the details.'}</span></div>
   </div>

   <div className={styles.detail}>
    <div className={styles.detailTop}><span className={styles.eyebrow}>{labels?.eyebrow||'A NOTE ON'}</span><span className={styles.detailNumber}>{number}</span></div>
    <AnimatePresence mode="wait" initial={false}>
     <motion.div key={current.handle||current.name} className={styles.copy} initial={{opacity:0,y:reduced?0:9}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-7}} transition={{duration:reduced?0:.22}}>
      <h3>{current.name}</h3>
      <p>{current.description||`Follow ${current.name} into the collection. Take a closer look at the products, their ingredient stories, and the small details that make them your own.`}</p>
      <Link className={styles.ingredientLink} href={ingredientHref}>{labels?.linkLabel||`Explore ${current.name}`}<ArrowUpRight size={17}/></Link>
      {related.length>0&&<div className={styles.productConnections}>
       <div className={styles.connectionsHeading}><span>{labels?.title||'IN THE COLLECTION'}</span><span>{related.length} {related.length===1?'product':'products'}</span></div>
       {related.slice(0,2).map(product=><Link className={styles.productLink} href={`/products/${product.handle}`} key={product.handle}>
        {(product.image||product.images[0]?.url)&&<span className={styles.productThumbnail}><Image src={(product.image||product.images[0].url)!} alt="" fill sizes="56px"/></span>}
        <span><small>{product.productType||'Everyday care'}</small><strong>{product.title}</strong></span><MoveUpRight size={17}/>
       </Link>)}
       {related.length>2&&<Link className={styles.moreProducts} href={ingredientHref}>{labels?.secondaryLabel||`Discover all ${related.length} products`}<ArrowUpRight size={14}/></Link>}
      </div>}
     </motion.div>
    </AnimatePresence>
    {items.length>1&&<div className={styles.navigation}><span>{content?.note||'Keep your curiosity.'}</span><div><button type="button" aria-label="Previous ingredient" onClick={()=>select(selected-1)}><ArrowLeft size={19}/></button><button type="button" aria-label="Next ingredient" onClick={()=>select(selected+1)}><ArrowRight size={19}/></button></div></div>}
   </div>
  </div>
 </div>;
}
