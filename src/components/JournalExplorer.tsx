'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import Image from '@/components/ContentImage';
import {ArrowUpRight, Search, X} from 'lucide-react';
import {motion, useReducedMotion} from 'motion/react';
import type {Article} from '@/lib/journal';
import type {ContentSection} from '@/lib/content-safety';
import {editableText} from '@/lib/content-safety';
import {useSiteContent} from './SiteContentProvider';
import styles from '@/app/journal/journal.module.css';

export default function JournalExplorer({articles, initialCategory, initialQuery,content}: {
 articles: Article[]; initialCategory?: string; initialQuery?: string;content?:ContentSection;
}) {
 const siteContent=useSiteContent();
 const text=(key:string,fallback:string)=>editableText(siteContent,`journal-${key}`,fallback);
 const categories = useMemo(() => [...new Set(articles.map(article => article.category))], [articles]);
 const [category, setCategory] = useState(categories.includes(initialCategory || '') ? initialCategory! : '');
 const [query, setQuery] = useState(initialQuery || '');
 const reducedMotion = useReducedMotion();
 const updateFilters = (nextCategory: string, nextQuery: string) => {
  setCategory(nextCategory);
  setQuery(nextQuery);
  const url = new URL(window.location.href);
  if (nextCategory) url.searchParams.set('category', nextCategory); else url.searchParams.delete('category');
  if (nextQuery) url.searchParams.set('q', nextQuery); else url.searchParams.delete('q');
  window.history.replaceState(window.history.state, '', url);
 };
 useEffect(() => {
  const restoreFilters = () => {
   const params = new URL(window.location.href).searchParams;
   const restoredCategory = params.get('category') || '';
   setCategory(categories.includes(restoredCategory) ? restoredCategory : '');
   setQuery(params.get('q') || '');
  };
  window.addEventListener('popstate', restoreFilters);
  return () => window.removeEventListener('popstate', restoreFilters);
 }, [categories]);
 const filtered = useMemo(() => {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return articles.filter(article => (!category || article.category === category) && words.every(word =>
   [article.title, article.excerpt, article.category, ...article.paragraphs, ...(article.sections || []).flatMap(part => [part.heading, ...part.paragraphs])].join(' ').toLocaleLowerCase().includes(word),
  ));
 }, [articles, category, query]);

 return content?.enabled===false?null:<section id="journal-stories" className={styles.archive} aria-labelledby="journal-stories-title">
  <div className={styles.archiveHeading}>
   <div><p className={styles.kicker}>{content?.eyebrow||'THE READING ROOM'}</p><h2 id="journal-stories-title">{content?.title||'Follow your'} <em>{content?.titleEmphasis||'curiosity.'}</em></h2></div>
   <p style={{whiteSpace:'pre-line'}}>{content?.body||'Everyday observations.\nIdeas to come back to.'}</p>
  </div>
  <div className={styles.archiveControls}>
   <div className={styles.filters} role="group" aria-label="Filter stories by topic">
    <button type="button" onClick={() => updateFilters('', query)} aria-pressed={!category}>{content?.secondaryLabel||'All stories'} <span>{articles.length}</span></button>
    {categories.map(item => <button type="button" key={item} onClick={() => updateFilters(item, query)} aria-pressed={category === item}>{item}</button>)}
   </div>
   <div className={styles.search}>
    <Search size={18} aria-hidden="true"/>
    <input type="search" aria-label="Search journal stories" placeholder={content?.caption||'Find a story'} value={query} onChange={event => updateFilters(category, event.target.value)}/>
    {query && <button type="button" aria-label="Clear search" onClick={() => updateFilters(category, '')}><X size={16}/></button>}
   </div>
  </div>
  <p className={styles.resultCount} role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? text('story','story') : text('stories','stories')}{category ? ` ${text('in','in')} ${category.toLowerCase()}` : ` ${text('count-note','to spend a little time with')}`}{query.trim() ? ` ${text('matching','matching')} “${query.trim()}”` : ''}</p>
  {filtered.length ? <div className={styles.storyGrid}>
   {filtered.map((article, index) => <motion.article
    key={article.slug} className={styles.storyCard}
    initial={false} animate={{opacity: 1, y: 0}}
    whileHover={reducedMotion ? undefined : {y: -4}}
    transition={{duration: .25}}
   >
    <Link href={`/journal/${article.slug}`} className={styles.storyImage} aria-label={`Read ${article.title}`}>
     <Image mobileSrc={article.mobileImage} src={article.image || '/images/botanical-study.webp'} alt={article.imageAlt || article.title} fill sizes="(max-width: 650px) 90vw, (max-width: 1000px) 44vw, 29vw" style={{objectPosition:article.imagePosition||'center'}}/>
     <span className={styles.cardNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
     <span className={styles.cardArrow} aria-hidden="true"><ArrowUpRight size={21}/></span>
    </Link>
    <div className={styles.storyCopy}>
     <div className={styles.meta}><span>{article.category}</span><span>{article.readTime}</span></div>
     <h3><Link href={`/journal/${article.slug}`}>{article.title}</Link></h3>
     <p>{article.excerpt}</p>
     <Link href={`/journal/${article.slug}`} className={styles.inlineLink} aria-label={`Read the story: ${article.title}`}>{content?.linkLabel||'Read the story'} <ArrowUpRight size={16}/></Link>
    </div>
   </motion.article>)}
  </div> : <div className={styles.emptyState}>
   <Search size={27} strokeWidth={1.2} aria-hidden="true"/>
   <h3>{articles.length ? text('no-match-title','A different word, perhaps?') : text('empty-title','A little space for what comes next.')}</h3>
   <p>{articles.length ? text('no-match-body','No stories match this combination. Try another topic or clear your search.') : text('empty-body','There are no stories here just now. Explore the collection while the next chapter takes shape.')}</p>
   {articles.length ? <button type="button" onClick={() => updateFilters('', '')} className={styles.pillButton}>{text('reset','Show all stories')}</button> : <Link href="/shop" className={styles.pillButton}>{text('explore','Explore the collection')} <ArrowUpRight size={16}/></Link>}
  </div>}
 </section>;
}

