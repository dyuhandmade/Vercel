'use client';

import {useId,useState,type CSSProperties} from 'react';
import Image from './ContentImage';
import Link from 'next/link';
import {ArrowDown,ArrowUpRight,Plus,Minus,Leaf,Hand,Sun} from 'lucide-react';
import type {SiteContent} from '@/lib/site-content';
import styles from './StoryExperience.module.css';

const principles=[
 {handle:'story-botanical',label:'A curiosity for nature',title:'Begin with the ingredient.',body:'A name on a label can open up a whole world: a flower, a seed, a leaf. We invite you to meet the botanicals behind the collection and follow them into the products you choose.',detail:'Explore the ingredient directory, then look at the full ingredient list on each product. The details belong to the individual formula.',image:'/images/botanical-study.webp',alt:'Illustrative arrangement of flowers, leaves and botanical textures',link:'/ingredients',action:'Explore the ingredients',icon:Leaf},
 {handle:'story-human',label:'Room for the human touch',title:'Look a little closer.',body:'The everyday objects we live with deserve our attention. Their texture, their form and the way we use them all become part of the experience of care.',detail:'Our atelier lets you turn an object in 3D, explore its photographs and follow the making information available for each product. Take your time with the details.',image:'/images/atelier-craft-v2.webp',alt:'Illustrative close-up of hands working with botanical care ingredients',link:'/how-its-made',action:'Inside the making',icon:Hand},
 {handle:'story-ritual',label:'A place in your everyday',title:'Make the moment yours.',body:'A fresh beginning. A quiet evening. A small pause between one thing and the next. Care can belong to the life you already have.',detail:'Start with a form you enjoy, read its directions and let it find a place in your day. There is no single way to make a moment feel like your own.',image:'/images/atelier-ritual-v2.webp',alt:'Illustrative scene of a quiet everyday care ritual',link:'/shop',action:'Find your everyday care',icon:Sun},
];

const pathways=[
 {number:'01',title:'Know what draws you in.',body:'Start with a botanical, a scent or a texture. Our ingredient directory connects the natural world to the collection.',link:'/ingredients',action:'Meet the botanicals'},
 {number:'02',title:'Get to know the object.',body:'Explore the photographs, turn the product in 3D, and read its ingredients and directions before making it yours.',link:'/shop',action:'Visit the collection'},
 {number:'03',title:'Keep a little curiosity.',body:'The journal is a place for practical notes, closer looks and ideas to carry into your own everyday moments.',link:'/journal',action:'Read the journal'},
];

export default function StoryExperience({content}:{content:SiteContent}){
 const intro=content.sections['story-page'];
 const beginning=content.sections['story-beginning'];
 const invitation=content.sections['story-invitation'];
 const principleHeading=content.sections['story-principles'];
 const everyday=content.sections['story-everyday'];
 const inset=content.sections['story-inset'];
 const paths=pathways.map((path,index)=>{
  const saved=content.sections[`story-pathway-${index+1}`];
  return {...path,enabled:saved?.enabled,order:saved?.sortOrder??index,title:saved?.title||path.title,body:saved?.body||path.body,link:saved?.linkUrl||path.link,action:saved?.linkLabel||path.action};
 }).filter(path=>path.enabled!==false).sort((a,b)=>a.order-b.order);
 const [active,setActive]=useState<number|null>(0);
 const id=useId();
 const entries=principles.filter(item=>content.sections[item.handle]?.enabled!==false).map(item=>{
  const saved=content.sections[item.handle];
  return {...item,label:saved?.caption||item.label,title:saved?.title||item.title,body:saved?.body||item.body,detail:saved?.note||item.detail,image:saved?.image||item.image,mobileImage:saved?.mobileImage,alt:saved?.imageAlt||item.alt,imagePosition:saved?.imagePosition,link:saved?.linkUrl||item.link,action:saved?.linkLabel||item.action};
 });
 const selected=Math.min(active??0,entries.length-1);
 const current=entries[selected];
 const showBeginning=beginning?.enabled!==false;
 const showPrinciples=principleHeading?.enabled!==false&&entries.length>0;
 const showEveryday=everyday?.enabled!==false;
 const chapters=[
  {href:'#story-beginning',label:beginning?.caption||'A starting point',show:showBeginning},
  {href:'#story-principles',label:principleHeading?.caption||'What we come back to',show:showPrinciples},
  {href:'#story-everyday',label:everyday?.caption||'The story meets your day',show:showEveryday},
 ].filter(chapter=>chapter.show);

 return <div className={styles.story}>
  <header className={styles.hero}>
   <div className={styles.heroCopy}>
    <p className={styles.eyebrow}>{intro?.eyebrow||'OUR STORY / THE WORLD OF DYU'}</p>
    <h1>{intro?.title||'A little closer'}<br/><em>{intro?.titleEmphasis||'to what matters.'}</em></h1>
    <p className={styles.introduction}>{intro?.body||'Botanical curiosity. The human touch. A little space for yourself. These are the things we come back to at DYUhandmade.'}</p>
    <Link className={styles.readOn} href={intro?.linkUrl||chapters[0]?.href||'/shop'}><span>{intro?.linkLabel||(chapters.length?'Come a little closer':'Explore the collection')}</span><ArrowDown size={18} strokeWidth={1.5} aria-hidden="true"/></Link>
   </div>
   <div className={styles.heroComposition}>
    <figure className={styles.heroImage}>
     <Image mobileSrc={intro?.mobileImage} src={intro?.image||'/images/atelier-craft-v2.webp'} alt={intro?.imageAlt||'Illustrative scene of hands and botanical care in the atelier'} fill sizes="(max-width:760px) 88vw, 44vw" preload style={{objectPosition:intro?.imagePosition||'center'}}/>
     <figcaption>{intro?.caption||'A study in care. A world to make your own.'}</figcaption>
    </figure>
    {inset?.enabled!==false&&<div className={styles.botanicalInset}><Image mobileSrc={inset?.mobileImage} src={inset?.image||'/images/botanical-study.webp'} alt={inset?.imageAlt||''} fill sizes="(max-width:760px) 34vw, 15vw" style={{objectPosition:inset?.imagePosition||'center'}}/></div>}
    <span className={styles.imageNote}>{intro?.note||'THE DYU ATELIER / ILLUSTRATIVE SCENE'}</span>
   </div>
  </header>

  {chapters.length>0&&<nav className={styles.chapters} aria-label="Our story chapters" style={{'--story-chapter-count':chapters.length} as CSSProperties}>
   {chapters.map((chapter,index)=><a key={chapter.href} href={chapter.href}><span>0{index+1}</span>{chapter.label}<ArrowDown size={15} aria-hidden="true"/></a>)}
  </nav>}

  {showBeginning&&<section id="story-beginning" className={styles.beginning} aria-labelledby="story-beginning-heading">
   <div className={styles.sectionAside}><span className={styles.eyebrow}>{beginning?.eyebrow||'01 / A STARTING POINT'}</span><Leaf size={38} strokeWidth={.85} aria-hidden="true"/></div>
   <div>
    <h2 id="story-beginning-heading">{beginning?.title||'The ordinary can hold'}{' '}<em>{beginning?.titleEmphasis||'something beautiful.'}</em></h2>
    <div className={styles.beginningCopy}>
     <p>{beginning?.body||'A bar of soap by the basin. A few drops of oil. A familiar texture in your hands. Small things can change how a moment feels.'}</p>
     <p>{beginning?.note||'DYUhandmade brings together soaps, oils, ubtans and body care in a collection made to be explored. Our world begins with nature and continues in the everyday moments you make your own.'}</p>
    </div>
   </div>
  </section>}

  {showPrinciples&&current&&<section id="story-principles" className={styles.principles} aria-labelledby="story-principles-heading">
   <div className={styles.principlePhoto}>
    <Image mobileSrc={current.mobileImage} key={current.image} src={current.image} alt={current.alt} fill sizes="(max-width:760px) 88vw, 40vw" style={{objectPosition:current.imagePosition||'center'}}/>
    <span className={styles.photoTag}><Leaf size={15} aria-hidden="true"/>{principleHeading?.note||'NATURE / CRAFT / EVERYDAY'}</span>
   </div>
   <div className={styles.principleCopy}>
    <p className={styles.eyebrow}>{principleHeading?.eyebrow||'02 / WHAT WE COME BACK TO'}</p>
    <h2 id="story-principles-heading">{principleHeading?.title||'A way of seeing.'}<br/><em>{principleHeading?.titleEmphasis||'A way of caring.'}</em></h2>
    <div className={styles.accordion}>
     {entries.map((entry,index)=>{
      const open=active!==null&&selected===index;
      const Icon=entry.icon;
      return <div className={styles.principle} key={entry.handle} data-open={open}>
       <h3><button type="button" aria-expanded={open} aria-controls={`${id}-principle-${index}`} id={`${id}-trigger-${index}`} onClick={()=>setActive(open?null:index)}>
        <span className={styles.principleNumber}>0{index+1}</span><span>{entry.label}</span>{open?<Minus size={18} aria-hidden="true"/>:<Plus size={18} aria-hidden="true"/>}
       </button></h3>
       <div id={`${id}-principle-${index}`} role="region" aria-labelledby={`${id}-trigger-${index}`} hidden={!open} className={styles.principleDetail}>
        <span className={styles.detailHeading}><Icon size={18} strokeWidth={1.3} aria-hidden="true"/>{entry.title}</span>
        <p>{entry.body}</p><p>{entry.detail}</p>
        <Link href={entry.link} className={styles.textLink}>{entry.action}<ArrowUpRight size={17} aria-hidden="true"/></Link>
       </div>
      </div>;
     })}
    </div>
   </div>
  </section>}

  {showEveryday&&<section id="story-everyday" className={styles.everyday} aria-labelledby="story-everyday-heading">
   <header className={styles.sectionHeading}><div><p className={styles.eyebrow}>{everyday?.eyebrow||'03 / THE STORY MEETS YOUR DAY'}</p><h2 id="story-everyday-heading">{everyday?.title||'From our world,'}{' '}<em>{everyday?.titleEmphasis||'into your everyday.'}</em></h2></div><p>{everyday?.body||<>There is more than one place to begin.<br/>Follow what makes you curious.</>}</p></header>
   <div className={styles.pathways}>{paths.map(path=><Link key={path.number} className={styles.pathway} href={path.link}>
    <div className={styles.pathwayTop}><span>{path.number}</span><ArrowUpRight size={22} strokeWidth={1.3} aria-hidden="true"/></div>
    <h3>{path.title}</h3><p>{path.body}</p><span className={styles.pathwayAction}>{path.action}<ArrowUpRight size={16} aria-hidden="true"/></span>
   </Link>)}</div>
  </section>}

  {invitation?.enabled!==false&&<section className={styles.invitation} aria-labelledby="story-invitation-heading">
   <div className={styles.invitationImage}><Image mobileSrc={invitation?.mobileImage} src={invitation?.image||'/images/atelier-ritual-v2.webp'} alt={invitation?.imageAlt||'Illustrative botanical care objects in warm everyday light'} fill sizes="(max-width:760px) 100vw, 45vw" style={{objectPosition:invitation?.imagePosition||'center'}}/></div>
   <div className={styles.invitationCopy}><p className={styles.eyebrow}>{invitation?.eyebrow||'THE NEXT CHAPTER IS YOURS'}</p><h2 id="story-invitation-heading">{invitation?.title||'A little nature.'}<br/><em>{invitation?.titleEmphasis||'A moment of your own.'}</em></h2><p>{invitation?.body||'Meet the collection, find what speaks to you, and make room for a little everyday care.'}</p><Link href={invitation?.linkUrl||'/shop'} className={styles.button}>{invitation?.linkLabel||'Discover your ritual'}<ArrowUpRight size={18} aria-hidden="true"/></Link></div>
  </section>}
 </div>;
}

