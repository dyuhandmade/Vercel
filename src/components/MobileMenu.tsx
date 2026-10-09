'use client';

import {useEffect,useId,useRef,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {AnimatePresence,motion} from 'motion/react';
import {ArrowUpRight,BookOpen,Hand,Leaf,MessageCircle,ShoppingBag,Sprout,UserRound,Heart,X} from 'lucide-react';
import type {Collection} from '@/lib/types';
import type {SiteContent} from '@/lib/site-content';
import {configuredBrandLogo} from '@/lib/brand';
import {navigationItems} from '@/lib/navigation-content';
import {editableText} from '@/lib/content-safety';
import {useReducedMotionPreference} from '@/lib/use-reduced-motion';
import styles from './MobileMenu.module.css';

type NavItem={key:string;label:string;href:string};
type Props={open:boolean;close:()=>void;nav:NavItem[];collections:Collection[];path:string;content?:SiteContent};
const icons={collection:ShoppingBag,story:Sprout,ingredients:Leaf,journal:BookOpen};
const activePath=(path:string,href:string)=>path===href||(href!=='/'&&href.startsWith('/')&&path.startsWith(`${href}/`));

export default function MobileMenu({open,close,nav,collections,path,content}:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const returnFocus=useRef<HTMLElement|null>(null);
 const previousOverflow=useRef<string|null>(null);
 const openRef=useRef(open);openRef.current=open;
 const closeAction=useRef(close);closeAction.current=close;
 const reduced=useReducedMotionPreference();
 const uid=useId();
 const [highlight,setHighlight]=useState<string|null>(null);
 const selected=highlight||nav.find(item=>activePath(path,item.href))?.key;
 const secondary=navigationItems(content,'navigation-mobile-secondary',['making','contact']).map(item=>({...item,icon:item.key==='making'?Hand:item.key==='contact'?MessageCircle:Leaf}));
 const allCollections=nav.find(item=>item.key==='collection')?.href||'/shop';
 const brand=content?.sections.brand,copy=content?.sections['mobile-menu'];

 function finishClosing(){
  if(openRef.current)return;
  dialog.current?.close();
  if(previousOverflow.current!==null){document.body.style.overflow=previousOverflow.current;previousOverflow.current=null;}
  if(returnFocus.current?.isConnected)returnFocus.current.focus({preventScroll:true});
 }
 useEffect(()=>{
  const element=dialog.current;
  if(!element||!open)return;
  setHighlight(null);
  if(!element.open){
   returnFocus.current=document.activeElement as HTMLElement;
   previousOverflow.current=document.body.style.overflow;
   document.body.style.overflow='hidden';
   element.showModal();
  }
  closeButton.current?.focus({preventScroll:true});
 },[open]);
 useEffect(()=>{
  const desktop=window.matchMedia('(min-width: 851px)');
  const onResize=()=>{if(desktop.matches&&openRef.current)closeAction.current();};
  desktop.addEventListener('change',onResize);
  return()=>{
   desktop.removeEventListener('change',onResize);
   if(previousOverflow.current!==null){document.body.style.overflow=previousOverflow.current;previousOverflow.current=null;}
  };
 },[]);
 const itemMotion={closed:{opacity:0,x:reduced?0:8},open:{opacity:1,x:0,transition:{duration:reduced?0:.28}}};

 return <dialog ref={dialog} id="mobile-menu" className={styles.dialog} aria-label="Explore DYU" onCancel={event=>{event.preventDefault();close();}} onKeyDown={event=>{
  if(event.key!=='Tab')return;
  const focusable=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]')).filter(element=>element.tabIndex>=0&&element.getClientRects().length>0);
  const first=focusable[0],last=focusable[focusable.length-1];
  if(!first){event.preventDefault();return;}
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }}>
  <AnimatePresence onExitComplete={finishClosing}>
   {open&&<motion.div key="scrim" className={styles.scrim} aria-hidden="true" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:.2}} onClick={close}/>}
   {open&&<motion.div key="frame" className={styles.frame} initial="closed" animate="open" exit="closed">
    <motion.div layoutRoot data-testid="mobile-menu-drawer" className={styles.drawer} variants={{closed:{x:reduced?0:'100%',transition:{duration:reduced?0:.24,ease:[.4,0,1,1]}},open:{x:0,transition:reduced?{duration:0}:{type:'spring',stiffness:340,damping:38,staggerChildren:.035}}}}>
     <header className={styles.header}>
      <Link href={brand?.linkUrl||'/'} className={styles.logo} aria-label={brand?.linkLabel||`${brand?.caption||'DYUhandmade'} home`} onClick={close}><Image {...configuredBrandLogo(brand)} sizes="82px" unoptimized/></Link>
      <span className={styles.headerNote} style={{whiteSpace:'pre-line'}}>{copy?.body||'A LITTLE CLOSER\nTO NATURE.'}</span>
      <button ref={closeButton} type="button" className={styles.close} aria-label="Close Explore DYU" onClick={close}><X size={21} strokeWidth={1.4}/></button>
     </header>

     <motion.div layoutScroll className={styles.body}>
      <div className={styles.accountLinks}><Link href="/account" onClick={close} aria-current={activePath(path,'/account')?'page':undefined}><UserRound size={18} strokeWidth={1.3}/><span>{editableText(content,'navigation-account','Your account')}</span><ArrowUpRight size={15}/></Link><Link href="/account/wishlist" onClick={close} aria-label="Your wishlist"><Heart size={18} strokeWidth={1.3}/></Link></div><p className={styles.eyebrow}>{copy?.eyebrow||'EXPLORE DYU'}</p>
      <nav className={styles.navigation} aria-label="Mobile navigation" onMouseLeave={()=>setHighlight(null)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setHighlight(null);}}>
       {nav.map(({key,label,href})=>{
        const Icon=icons[key as keyof typeof icons]||Leaf;
        return <motion.div key={key} variants={itemMotion}>
         <Link className={styles.navLink} href={href} aria-current={activePath(path,href)?'page':undefined} onClick={close} onMouseEnter={()=>setHighlight(key)} onFocus={()=>setHighlight(key)}>
          {selected===key&&<motion.span className={styles.highlight} layoutId={`${uid}-nav-highlight`} transition={reduced?{duration:0}:{type:'spring',stiffness:370,damping:34}}/>}
          <span className={styles.navIcon}><Icon size={18} strokeWidth={1.2}/></span><span className={styles.navLabel}>{label}</span><ArrowUpRight size={15} className={styles.navArrow} strokeWidth={1.3}/>
         </Link>
        </motion.div>;
       })}
      </nav>

      {collections.length>0&&<motion.section variants={itemMotion} className={styles.collections} aria-labelledby={`${uid}-collections-heading`}>
       <div className={styles.sectionHeading}><h2 id={`${uid}-collections-heading`}>{copy?.title||'SHOP BY COLLECTION'}</h2><Link href={copy?.linkUrl||allCollections} onClick={close}>{copy?.linkLabel||'View all'}<ArrowUpRight size={12}/></Link></div>
       <nav className={styles.collectionGrid} aria-label="Shop by collection">
        {collections.map(collection=><Link className={styles.collection} key={collection.handle} href={collection.href||`/collections/${collection.handle}`} aria-current={activePath(path,collection.href||`/collections/${collection.handle}`)?'page':undefined} onClick={close}>
         <span className={styles.collectionImage}>{collection.image?.url?<Image src={collection.image.url} alt="" width={40} height={40} sizes="40px"/>:<Leaf size={19} strokeWidth={1}/>}</span><span>{collection.title}</span>
        </Link>)}
       </nav>
      </motion.section>}

      {secondary.length>0&&<motion.nav variants={itemMotion} className={styles.secondary} aria-label="More from DYU">
       {secondary.map(({key,label,href,icon:Icon})=><Link key={key} href={href} aria-current={activePath(path,href)?'page':undefined} onClick={close}><Icon size={16} strokeWidth={1.2}/><span>{label}</span><ArrowUpRight size={12}/></Link>)}
      </motion.nav>}
     </motion.div>
     <footer className={styles.footer}><span className={styles.footerLeaf}><Leaf size={14} strokeWidth={1.1}/></span><span>{copy?.note||'A little nature. A human touch.'}</span><i aria-hidden="true"/></footer>
    </motion.div>
   </motion.div>}
  </AnimatePresence>
 </dialog>;
}
