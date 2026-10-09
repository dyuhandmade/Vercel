import Link from 'next/link';
import Image from '@/components/ContentImage';
import {ArrowDown, ArrowUpRight, BookOpen} from 'lucide-react';
import {getArticles} from '@/lib/journal';
import {getSiteContent, section} from '@/lib/site-content';
import JournalExplorer from '@/components/JournalExplorer';
import styles from './journal.module.css';

export const metadata = {
 title: 'The journal — Notes for everyday living',
 description: 'Stories and practical notes on everyday rituals, botanical curiosity and considered living from the DYU atelier.',
};

export default async function Journal({searchParams}: {searchParams: Promise<{category?: string | string[]; q?: string | string[]}>}) {
 const [content, filters] = await Promise.all([getSiteContent(), searchParams]);
 const intro = section(content, 'journal-page');
 const feature=section(content,'journal-featured');
 const invitation=section(content,'journal-invitation');
 const archive=section(content,'journal-archive');
 const articles = getArticles(content);
 const featured = articles[0];
 return <div className={styles.journal}>
  <header className={styles.masthead}>
   <div>
    <p className={styles.kicker}>{intro.eyebrow || 'THE DYU JOURNAL'}</p>
    <h1>{intro.title || 'A little time.'}{' '}<em>{intro.titleEmphasis || 'A fresh perspective.'}</em></h1>
   </div>
   <div className={styles.mastheadNote}>
    <BookOpen size={25} strokeWidth={1.3} aria-hidden="true"/>
    <p>{intro.body || 'Stories to stay curious, find your rhythm, and see the everyday a little differently.'}</p>
    <a href={intro.linkUrl||(archive.enabled===false?'/shop':'#journal-stories')} className={styles.inlineLink}>{intro.linkLabel||(archive.enabled===false?'Explore the collection':'Find something to read')} <ArrowDown size={16}/></a>
   </div>
  </header>

  {feature.enabled!==false&&featured && <section className={styles.featured} aria-labelledby="featured-story-title">
   <Link href={`/journal/${featured.slug}`} className={styles.featuredImage} aria-label={`Read ${featured.title}`}>
    <Image mobileSrc={featured.mobileImage} src={featured.image || '/images/atelier-ritual-v2.webp'} alt={featured.imageAlt || featured.title} fill sizes="(max-width: 760px) 90vw, 55vw" preload style={{objectPosition:featured.imagePosition||'center'}}/>
    <span className={styles.photoLabel}>{feature.eyebrow||'THE EDITOR’S PICK'}</span>
    <span className={styles.imageArrow} aria-hidden="true"><ArrowUpRight size={25}/></span>
   </Link>
   <div className={styles.featuredCopy}>
    <div className={styles.meta}><span>{featured.category}</span><span>{featured.readTime}</span></div>
    <h2 id="featured-story-title"><Link href={`/journal/${featured.slug}`}>{featured.title}</Link></h2>
    <p>{featured.excerpt}</p>
    <Link href={`/journal/${featured.slug}`} className={styles.inlineLink}>{feature.linkLabel||'Settle into the story'} <ArrowUpRight size={18}/></Link>
    <span className={styles.featuredFootnote}>{feature.note||'A few quiet minutes, just for you.'}</span>
   </div>
  </section>}

  <JournalExplorer content={archive} articles={articles} initialCategory={Array.isArray(filters.category) ? filters.category[0] : filters.category} initialQuery={Array.isArray(filters.q) ? filters.q[0] : filters.q}/>

  {invitation.enabled!==false&&<section className={styles.collectionInvitation} aria-labelledby="journal-closing-title">
   <div className={styles.invitationHeading}><p className={styles.kicker}>{invitation.eyebrow||'FROM READING TO LIVING'}</p><h2 id="journal-closing-title"><span>{invitation.title||'Make it part of'}</span><em>{invitation.titleEmphasis||'your everyday.'}</em></h2></div>
   <div className={styles.invitationCopy}><p>{invitation.body||'The next small ritual is yours to choose. Get to know the objects, ingredients and ideas behind the collection.'}</p><Link href={invitation.linkUrl||'/shop'} className={styles.inlineLink}>{invitation.linkLabel||'Explore the collection'} <ArrowUpRight size={18}/></Link></div>
  </section>}
 </div>;
}
