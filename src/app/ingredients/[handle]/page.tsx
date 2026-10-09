import Image from '@/components/ContentImage';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,ArrowUpRight,Leaf} from 'lucide-react';
import {getProducts} from '@/lib/shopify';
import {getSiteContent,section} from '@/lib/site-content';
import {money} from '@/lib/types';
import {canonicalMetadata} from '@/lib/seo';
import {buildIngredientIndex,findIngredient} from '../ingredient-data';
import styles from '@/components/IngredientLibrary.module.css';

export async function generateMetadata({params}:{params:Promise<{handle:string}>}){
  const {handle}=await params;
  const [products,content]=await Promise.all([getProducts(),getSiteContent()]);
  const item=findIngredient(buildIngredientIndex(products,content),handle);
  return {title:item?`${item.name} · The ingredient atlas`:'Ingredient not found',description:item?.description||(item?`Explore ${item.name} in the DYUhandmade ingredient atlas. Find connected products and published ingredient information.`:undefined),...canonicalMetadata(`/ingredients/${handle}`)};
}

export default async function Ingredient({params}:{params:Promise<{handle:string}>}){
  const {handle}=await params;
  const [products,content]=await Promise.all([getProducts(),getSiteContent()]);
  const entries=buildIngredientIndex(products,content);
  const template=section(content,'ingredient-detail');
  const connections=section(content,'ingredient-connections');
  const note=section(content,'ingredient-note');
  const more=section(content,'ingredient-more');
  const item=findIngredient(entries,handle);
  if(!item)notFound();
  const related=products.filter(product=>item.references.some(ref=>ref.handle===product.handle));
  const nearby=entries.filter(entry=>entry.handle!==item.handle&&entry.family===item.family).slice(0,4);
  const image=item.image||item.references.find(ref=>ref.image)?.image;
  return <div className={styles.page}>
    <Link href={template.secondaryUrl||'/ingredients#ingredient-index'} className={styles.back}><ArrowLeft size={17}/> {template.secondaryLabel||'Back to the atlas'}</Link>
    <header className={styles.detailHero}>
      <div><p className={styles.eyebrow}>{item.family} / {template.eyebrow||'THE INGREDIENT ATLAS'}</p><h1>{item.name}{' '}<em>{template.titleEmphasis||'A closer look.'}</em></h1><p className={styles.detailIntro}>{item.description||`Follow ${item.name.toLowerCase()} through the DYU collection. Discover the products that carry this name, and read the details for each one.`}</p><a href="#ingredient-products" className={styles.primaryLink}>Explore {related.length} {related.length===1?'product':'products'} <ArrowUpRight size={17}/></a><p className={styles.detailSource}>{item.hasStory?'Ingredient story supplied with the collection.':'Indexed from product names and published ingredient information.'}</p></div>
      <figure className={styles.detailFigure}><div>{image?<Image mobileSrc={item.mobileImage} src={image} alt={item.image?(item.imageAlt||item.name):`${item.references.find(ref=>ref.image)?.title} — product photograph`} fill preload sizes="(max-width: 800px) 88vw, 40vw" className={item.image?styles.ingredientPhoto:styles.productPhoto} style={{objectPosition:item.imagePosition||'center'}}/>:<Leaf size={140} strokeWidth={.5}/>}</div><figcaption>{template.caption||(item.image?'From the ingredient notebook':'A product from the collection')}<span>{String(related.length).padStart(2,'0')} / connected</span></figcaption></figure>
    </header>
    <section className={styles.detailProducts} id="ingredient-products" aria-labelledby="products-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{connections.eyebrow||'THE CONNECTIONS'}</p><h2 id="products-heading">{connections.title||'Find it in'} <em>{connections.titleEmphasis||'your everyday.'}</em></h2></div><p style={{whiteSpace:'pre-line'}}>{connections.body||'Read the details.\nChoose what feels like you.'}</p></div><div className={styles.grid}>{related.map(product=>{
      const reference=item.references.find(ref=>ref.handle===product.handle)!;
      return <article className={styles.card} key={product.handle}><Link href={`/products/${product.handle}`} className={styles.cardLink}><div className={styles.cardArt}>{product.image?<Image src={product.image} alt={product.title} fill sizes="(max-width:600px) 84vw, (max-width:1100px) 42vw, 28vw" className={styles.productPhoto}/>:<Leaf size={70} strokeWidth={1}/>}<span className={styles.artNote}>{product.availableForSale?'Explore the ritual':'Currently sold out'}</span><span className={styles.cardArrow}><ArrowUpRight size={20}/></span></div><div className={styles.cardCopy}><span className={styles.eyebrow}>{product.productType}</span><h3>{product.title}</h3><p>{money(product.price)}<span>View product ↗</span></p></div></Link><p className={styles.reference}>Connection: {reference.basis.toLowerCase()}</p></article>;
    })}</div></section>
    {note.enabled!==false&&<aside className={styles.detailNote}><Leaf size={25} strokeWidth={1}/><p>{note.body||'A botanical name is a starting point for discovery. For the complete formula and use instructions, read the individual product details and packaging.'}</p><Link href={note.linkUrl||'/contact'} className={styles.textLink}>{note.linkLabel||'Ask us a question'} <ArrowUpRight size={17}/></Link></aside>}
    {more.enabled!==false&&nearby.length>0&&<section className={styles.more}><p className={styles.eyebrow}>{more.eyebrow||'KEEP YOUR CURIOSITY GOING'}</p><h2>{more.title||'More from'} <em>{more.titleEmphasis||`${item.family.toLowerCase()}.`}</em></h2><div>{nearby.map(entry=><Link key={entry.handle} href={`/ingredients/${encodeURIComponent(entry.handle)}`}><span>{entry.name}</span><small>{entry.references.length} {entry.references.length===1?'product':'products'}</small><ArrowUpRight size={20}/></Link>)}</div></section>}
  </div>;
}
