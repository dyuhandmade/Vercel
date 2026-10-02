import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpRight,Leaf,Hand,Sun,MessageCircle} from 'lucide-react';
import {getProducts,getCollections,discoveryCollections,isDemo} from '@/lib/shopify';
import {getSiteContent,section} from '@/lib/site-content';
import {catalogueUrl} from '@/lib/atelier';
import {getArticles} from '@/lib/journal';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import AtelierHero from '@/components/AtelierHero';
import IngredientDiscovery from '@/components/IngredientDiscovery';
import CraftJourney from '@/components/CraftJourney';
import PhilosophyExperience from '@/components/PhilosophyExperience';
import RitualExperience from '@/components/RitualExperience';

const copy=(value:string|undefined,fallback:string,max=160)=>(value?.trim()||fallback).slice(0,max);
// Removed or unpublished references fall back to the current catalogue.
function choose<T extends {handle:string}>(items:T[],handles?:string[]){
 const selected=[...new Set(handles||[])].map(handle=>items.find(item=>item.handle===handle)).filter((item):item is T=>!!item);
 return selected.length?selected:items;
}

export default async function Home(){
 const demo=isDemo();
 const [products,collections,content]=await Promise.all([getProducts(),getCollections(),getSiteContent()]);
 const hero=section(content,'home-hero'),heroPreview=section(content,'home-hero-preview');
 const welcome=section(content,'home-welcome'),collectionEdit=section(content,'home-collections');
 const craft=section(content,'home-craft'),botanicals=section(content,'home-ingredients');
 const favorites=section(content,'home-favorites'),journal=section(content,'home-journal');
 const previewCandidates=products.filter(p=>p.image||p.images[0]?.url);
 const previewCategories=new Set<string>();
 const distinctPreviews=previewCandidates.filter(p=>{const category=p.productType||p.shape;if(previewCategories.has(category))return false;previewCategories.add(category);return true;});
 const defaultPreviews=[...distinctPreviews,...previewCandidates.filter(p=>!distinctPreviews.some(item=>item.id===p.id))];
 const previewProducts=choose(defaultPreviews,heroPreview.productHandles?.length?heroPreview.productHandles:hero.productHandles).slice(0,3).map(p=>({id:p.id,handle:p.handle,title:p.title,productType:p.productType,shape:p.shape,tone:p.tone,image:(p.image||p.images[0]?.url)!}));
 const ingredients=[...new Map(choose(products,botanicals.productHandles).flatMap(p=>p.ingredients).map(i=>[i.name,i])).values()];
 const configuredCollections=choose(collections,collectionEdit.collectionHandles);
 const discovery=collectionEdit.collectionHandles?.some(handle=>collections.some(c=>c.handle===handle))?configuredCollections:discoveryCollections(products,collections);
 const featuredCraft=choose(products,craft.productHandles).find(p=>p.craft.length>0)||products.find(p=>p.craft.length>0);
 const featuredProducts=choose(products,favorites.productHandles).slice(0,3);
 const collectionImages=['atelier-ritual-v2.webp','botanical-study.webp','atelier-hero.webp','atelier-craft-v2.webp'];
 const discoveryHref=collectionEdit.enabled!==false&&discovery.length?'#collections':'/shop';
 const articleSlugs=new Set(getArticles(content).map(article=>article.slug));
 const journalCards=[
  {handle:'home-journal-1',title:'The quiet art of making\ntime for yourself.',image:'/images/atelier-ritual-v2.webp',alt:'Illustrative quiet moment with linen and care vessels',category:'EVERYDAY RITUALS',href:'/journal/making-space-for-a-ritual'},
  {handle:'home-journal-2',title:'A little curiosity\ngoes a long way.',image:'/images/botanical-study.webp',alt:'A study of botanical forms and textures',category:'THOUGHTFUL CARE',href:'/journal/look-closer-at-your-care'}
 ].map(fallback=>({fallback,value:section(content,fallback.handle)})).filter(({value,fallback})=>{
  if(value.enabled===false)return false;
  const internalArticle=(value.linkUrl||fallback.href).match(/^\/journal\/([a-z0-9-]+)\/?(?:[?#].*)?$/);
  return !internalArticle||articleSlugs.has(internalArticle[1]);
 });
 const reassurance=[
  {label:'Explore the ingredients',href:'/ingredients',Icon:Leaf},
  {label:'Discover the making',href:'/how-its-made',Icon:Hand},
  {label:'Find your everyday ritual',href:'/shop',Icon:Sun},
  {label:'Browse our WhatsApp catalogue',href:catalogueUrl,Icon:MessageCircle}
 ].map((fallback,index)=>({fallback,value:section(content,`home-reassurance-${index+1}`)})).filter(({value})=>value.enabled!==false);
 return <div className="atelier-home">
  <AtelierHero products={previewProducts} demo={demo} content={hero} preview={heroPreview} discoveryHref={discoveryHref}/>
  {welcome.enabled!==false&&<section className="welcome-note">
   <span className="eyebrow">{copy(welcome.eyebrow,'NATURE. HANDS. YOUR EVERYDAY.',100)}</span>
   <p className="content-lines">{copy(welcome.title,'Some things ask you to hurry.')}<br/><em>{copy(welcome.titleEmphasis,'This is a place to take your time.')}</em></p>
   <a href={welcome.linkUrl||discoveryHref} className="quiet-scroll" aria-label={copy(welcome.linkLabel,'Discover the collections',80)}>↓</a>
  </section>}
  {collectionEdit.enabled!==false&&discovery.length>0&&<section className="section collection-edit collection-editorial" id="collections">
   <Reveal className="section-heading"><div><p className="eyebrow">{copy(collectionEdit.eyebrow,'A PLACE TO BEGIN',100)}</p><h2 className="content-lines">{copy(collectionEdit.title,'What does your')}<br/><em>{copy(collectionEdit.titleEmphasis,'day need?')}</em></h2></div><p className="section-aside content-lines">{copy(collectionEdit.body,'A fresh beginning. A quiet evening.\nA little something, just for someone.',500)}</p></Reveal>
   <div className="collection-grid">{discovery.slice(0,4).map((c,i)=><Link key={c.handle} href={c.href||`/collections/${c.handle}`} className={`collection-tile collection-${i}`}>
    <div className="collection-image"><Image src={c.image?.url||`/images/${collectionImages[i]}`} alt={c.image?.altText||`Illustrative still life for ${c.title}`} fill sizes="(max-width: 850px) 44vw, 22vw"/><span className="collection-number">0{i+1}</span><span className="collection-view">{copy(collectionEdit.linkLabel,'Enter the collection',80)} <ArrowUpRight size={17}/></span></div>
    <div className="collection-caption"><h3>{c.title}</h3><p>{c.description}</p></div>
   </Link>)}</div>
  </section>}
  <div className="home-story-flow">
   {section(content,'philosophy').enabled!==false&&<div id="philosophy"><PhilosophyExperience content={content}/></div>}
   {craft.enabled!==false&&(featuredCraft||demo)&&<section className="section craft-home flowing-craft" id="making" style={{paddingTop:'clamp(65px,7vw,110px)'}}>
    <div className="chapter-kicker"><span>{copy(craft.caption,'01 / THE HUMAN TOUCH',100)}</span><span>{copy(craft.note,'From an idea, to an object.',160)}</span></div>
    <CraftJourney items={featuredCraft?.craft} product={featuredCraft} content={craft}/>
    <div className="chapter-outro"><p>{copy(craft.secondaryLabel,'And in every detail, a reason to look closer.',160)}</p><Link href={craft.linkUrl||'/how-its-made'} className="text-link">{copy(craft.linkLabel,'Follow the making',80)} <ArrowUpRight size={15}/></Link></div>
   </section>}
   {botanicals.enabled!==false&&(ingredients.length>0||demo)&&<section className="section atlas-home flowing-atlas" id="botanicals">
    <IngredientDiscovery items={ingredients} content={botanicals}/>
    <Link href={botanicals.linkUrl||'/ingredients'} className="text-link atlas-follow">{copy(botanicals.linkLabel,'Open the ingredient library',80)} <ArrowUpRight size={16}/></Link>
   </section>}
   {section(content,'ritual').enabled!==false&&<section id="everyday"><RitualExperience content={content} preview destinationHref="/shop" destinationLabel="Find your ritual"/></section>}
  </div>
  {favorites.enabled!==false&&featuredProducts.length>0&&<section className="section favorites considered-edit"><Reveal className="section-heading"><div><p className="eyebrow">{copy(favorites.eyebrow,'BRING A LITTLE OF THAT FEELING HOME',100)}</p><h2 className="content-lines">{copy(favorites.title,'Find your')}<br/><em>{copy(favorites.titleEmphasis,'everyday companion.')}</em></h2></div><Link href={favorites.linkUrl||'/shop'} className="text-link">{copy(favorites.linkLabel,'Explore all rituals',80)} <ArrowUpRight size={16}/></Link></Reveal><div className="product-grid">{featuredProducts.map((p,i)=><Reveal key={p.id} delay={i*.06}><ProductCard product={p} index={i}/></Reveal>)}</div></section>}
  {journal.enabled!==false&&journalCards.length>0&&<section className="journal-preview section journal-editorial"><div className="section-heading"><div><p className="eyebrow">{copy(journal.eyebrow,'KEEP A LITTLE CURIOSITY',100)}</p><h2 className="content-lines">{copy(journal.title,'Notes for')} <em>{copy(journal.titleEmphasis,'slower days.')}</em></h2></div><Link className="text-link" href={journal.linkUrl||'/journal'}>{copy(journal.linkLabel,'From the journal',80)} <ArrowUpRight size={16}/></Link></div><div className="editorial-cards">{journalCards.map(({fallback,value})=><Link key={fallback.handle} href={value.linkUrl||fallback.href} className="editorial-card"><div className="editorial-photo"><Image src={value.image||fallback.image} alt={copy(value.imageAlt,fallback.alt,250)} fill sizes="(max-width:540px) 90vw, 45vw" style={value.imagePosition?{objectPosition:value.imagePosition}:undefined}/></div><span className="eyebrow">{copy(value.category,fallback.category,100)} / {copy(value.readTime,'3 MIN READ',50)}</span><h3 className="content-lines">{copy(value.title,fallback.title)}</h3></Link>)}</div></section>}
  {section(content,'home-reassurance').enabled!==false&&reassurance.length>0&&<section className="reassurance-strip">{reassurance.map(({fallback,value},index)=>{const href=value.linkUrl||fallback.href;return <Link key={index} href={href} {...(href.startsWith('https://')?{target:'_blank',rel:'noopener noreferrer'}:{})}><fallback.Icon/><span>{copy(value.linkLabel,fallback.label,80)}</span></Link>;})}</section>}
 </div>;
}

