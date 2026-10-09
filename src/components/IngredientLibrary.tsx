'use client';

import Image from './ContentImage';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {ArrowDown,ArrowUpRight,BookOpen,Leaf,Search,X} from 'lucide-react';
import type {IngredientEntry} from '@/app/ingredients/ingredient-data';
import {editableText} from '@/lib/content-safety';
import type {ContentSection,SiteContent} from '@/lib/content-safety';
import styles from './IngredientLibrary.module.css';

export default function IngredientLibrary({entries,intro,content}:{entries:IngredientEntry[];intro:ContentSection;content:SiteContent}){
  const text=(key:string,fallback:string)=>editableText(content,`ingredients-${key}`,fallback);
  const indexContent=content.sections['ingredients-index'];
  const reading=content.sections['ingredients-reading'];
  const guide=content.sections['ingredients-guide'];
  const faqs=[
    {handle:'ingredients-faq-1',title:'Where do these ingredient names come from?',body:'The atlas uses the ingredient stories and ingredient lists supplied with our products. It also includes botanical names that appear in product names. Each detail page shows the source beside the associated product.'},
    {handle:'ingredients-faq-2',title:'Is this a complete ingredient list?',body:'No. The atlas is a way to explore the collection. For a complete formulation, consult the ingredient information on the individual product page and the product packaging.'},
    {handle:'ingredients-faq-3',title:'Where can I ask about a particular product?',body:'Visit the product page for its published details, or get in touch with DYU with the product name and your question.',linkLabel:'Get in touch with DYU',linkUrl:'/contact'},
  ].map((entry,index)=>{const saved=content.sections[entry.handle];return {...entry,title:saved?.title||entry.title,body:saved?.body||entry.body,linkLabel:saved?.linkLabel||entry.linkLabel,linkUrl:saved?.linkUrl||entry.linkUrl,enabled:saved?.enabled,sortOrder:saved?.sortOrder??index};}).filter(entry=>entry.enabled!==false).sort((a,b)=>a.sortOrder-b.sortOrder);
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('All ingredients');
  const [sort,setSort]=useState('name');
  const categories=useMemo(()=>['All ingredients',...new Set(entries.map(entry=>entry.family))],[entries]);
  const filtered=useMemo(()=>entries.filter(entry=>(category==='All ingredients'||entry.family===category)&&`${entry.name} ${entry.family} ${entry.references.map(ref=>ref.title).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>sort==='products'?b.references.length-a.references.length||a.name.localeCompare(b.name):a.name.localeCompare(b.name)),[entries,query,category,sort]);
  const productCount=new Set(entries.flatMap(entry=>entry.references.map(ref=>ref.handle))).size;
  function reset(){setQuery('');setCategory('All ingredients');setSort('name');}
  return <div className={styles.page}>
    <section className={styles.hero} aria-labelledby="ingredient-heading">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{intro.eyebrow||'THE INGREDIENT ATLAS / DYU HANDMADE'}</p>
        <h1 id="ingredient-heading">{intro.title||'A world within.'}<br/><em>{intro.titleEmphasis||'Begin with a name.'}</em></h1>
        <p className={styles.intro}>{intro.body||'From flowers and leaves to oils and earth. Follow the ingredients and botanical names that run through our collection, one small detail at a time.'}</p>
        <a href={intro.linkUrl||(indexContent?.enabled===false?'/shop':'#ingredient-index')} className={styles.primaryLink}>{intro.linkLabel||(indexContent?.enabled===false?'Explore the collection':'Open the atlas')} <ArrowDown size={17}/></a>
        <div className={styles.heroStats}><span><strong>{String(entries.length).padStart(2,'0')}</strong> {intro.items?.[0]||'names to explore'}</span><span><strong>{String(productCount).padStart(2,'0')}</strong> {intro.items?.[1]||'products connected'}</span></div>
      </div>
      <figure className={styles.heroFigure}>
        <div className={styles.heroImage}><Image mobileSrc={intro.mobileImage} src={intro.image||'/images/botanical-study.webp'} alt={intro.imageAlt||'An illustrative still life of botanicals, oils and butter'} fill sizes="(max-width: 800px) 90vw, 44vw" preload style={{objectPosition:intro.imagePosition||'center'}}/></div>
        <div className={styles.figureSeal} aria-hidden="true"><Leaf size={27} strokeWidth={1}/><span style={{whiteSpace:'pre-line'}}>{intro.note||'THE\nBOTANICAL\nNOTEBOOK'}</span></div>
        <figcaption><span>{intro.secondaryLabel||'01 / Look a little closer'}</span><span>{intro.caption||'An illustrative botanical study'}</span></figcaption>
      </figure>
    </section>

    {indexContent?.enabled!==false&&<section className={styles.index} id="ingredient-index" aria-labelledby="index-heading">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{indexContent?.eyebrow||'A LIVING INDEX'}</p><h2 id="index-heading">{indexContent?.title||'Find what'} <em>{indexContent?.titleEmphasis||'draws you in.'}</em></h2></div><p style={{whiteSpace:'pre-line'}}>{indexContent?.body||'Browse by name or follow a family.\nEvery entry leads back to its products.'}</p></div>
      <div className={styles.toolbar}>
        <label className={styles.search}><Search size={19} aria-hidden="true"/><span className={styles.srOnly}>Search ingredients or products</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={indexContent?.caption||'Search rose, almond, a product…'}/>{query&&<button type="button" aria-label="Clear ingredient search" onClick={()=>setQuery('')}><X size={16}/></button>}</label>
        <label className={styles.sort}><span>{text('sort-label','Arrange by')}</span><select value={sort} onChange={event=>setSort(event.target.value)}><option value="name">{text('sort-name','Name, A–Z')}</option><option value="products">{text('sort-products','Most products')}</option></select></label>
      </div>
      <div className={styles.filters} role="group" aria-label="Ingredient families">{categories.map(item=><button type="button" key={item} aria-pressed={category===item} onClick={()=>setCategory(item)}>{item==='All ingredients'?text('all','All ingredients'):item}{category===item&&<span aria-hidden="true"> ·</span>}</button>)}</div>
      <div className={styles.results}><p role="status" aria-live="polite">{filtered.length} {filtered.length===1?text('entry','entry'):text('entries','entries')}{query.trim()?` ${text('for','for')} “${query.trim()}”`:''}</p><span>{indexContent?.note||'Take your curiosity somewhere.'}</span></div>
      {filtered.length>0?<div className={styles.grid}>{filtered.map((entry,index)=>{
        const picture=entry.image||entry.references.find(ref=>ref.image)?.image;
        return <article className={styles.card} key={entry.handle}>
          <Link href={`/ingredients/${encodeURIComponent(entry.handle)}`} className={styles.cardLink}>
            <div className={styles.cardArt}><span className={styles.number}>{String(index+1).padStart(2,'0')}</span>{picture?<Image mobileSrc={entry.mobileImage} src={picture} alt={entry.image?(entry.imageAlt||entry.name):`${entry.references.find(ref=>ref.image)?.title||entry.name} — product photograph`} fill sizes="(max-width: 600px) 84vw, (max-width: 1100px) 42vw, 28vw" className={entry.image?styles.ingredientPhoto:styles.productPhoto} style={{objectPosition:entry.imagePosition||'center'}}/>:<Leaf className={styles.emptyLeaf} size={82} strokeWidth={.65}/>}<span className={styles.artNote}>{entry.image?text('study','Ingredient study'):text('from-collection','From the collection')}</span><span className={styles.cardArrow}><ArrowUpRight size={21}/></span></div>
            <div className={styles.cardCopy}><span className={styles.eyebrow}>{entry.family}</span><h3>{entry.name}</h3><p>{entry.references.length} {entry.references.length===1?text('product','product'):text('products','products')} {text('discover','to discover')} <span>↗</span></p></div>
          </Link>
        </article>;
      })}</div>:<div className={styles.empty}><Search size={34} strokeWidth={1}/><h3>{entries.length?text('no-match-title','A different path, perhaps.'):text('empty-title','The notebook is opening.')}</h3><p>{entries.length?text('no-match-body','No entries match this search. Try another name or explore every family.'):text('empty-body','There are no ingredient stories or named botanicals to show just yet. You can still explore the current collection and each product’s details.')}</p>{entries.length?<button type="button" className={styles.primaryLink} onClick={reset}>{text('reset','Show all ingredients')} <ArrowUpRight size={17}/></button>:<Link className={styles.primaryLink} href="/shop">{text('explore','Explore the collection')} <ArrowUpRight size={17}/></Link>}</div>}
    </section>}

    {reading?.enabled!==false&&<section className={styles.readingNote} aria-labelledby="reading-heading"><span className={styles.noteIcon}><BookOpen size={27} strokeWidth={1}/></span><div><p className={styles.eyebrow}>{reading?.eyebrow||'THE SMALL PRINT, MADE SIMPLE'}</p><h2 id="reading-heading">{reading?.title||'A name is'} <em>{reading?.titleEmphasis||'the beginning.'}</em></h2><p>{reading?.body||'This atlas brings together ingredient stories, ingredient lists and botanical names used in our product names. A name alone is not a complete formula. Open a product to read the details provided for that particular ritual.'}</p></div><Link href={reading?.linkUrl||'/shop'} className={styles.textLink}>{reading?.linkLabel||'Meet the collection'} <ArrowUpRight size={17}/></Link></section>}
    {guide?.enabled!==false&&faqs.length>0&&<section className={styles.guide} aria-labelledby="guide-heading"><div><p className={styles.eyebrow}>{guide?.eyebrow||'A LITTLE GUIDANCE'}</p><h2 id="guide-heading">{guide?.title||'Good things'}{' '}<em>{guide?.titleEmphasis||'to know.'}</em></h2></div><div className={styles.questions}>
      {faqs.map(faq=><details key={faq.handle}><summary>{faq.title}<span aria-hidden="true">+</span></summary><p>{faq.body}{faq.linkUrl&&faq.linkLabel&&<> <Link href={faq.linkUrl}>{faq.linkLabel}</Link></>}</p></details>)}
    </div></section>}
  </div>;
}
