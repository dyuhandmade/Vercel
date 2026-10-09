import Link from 'next/link';
import Image from '@/components/ContentImage';
import {notFound} from 'next/navigation';
import {ArrowLeft, ArrowUpRight, Clock3, Leaf} from 'lucide-react';
import {getArticles} from '@/lib/journal';
import {getSiteContent,section} from '@/lib/site-content';
import {canonicalMetadata} from '@/lib/seo';
import JournalReader from '@/components/JournalReader';
import styles from '../journal.module.css';

export async function generateMetadata({params}: {params: Promise<{slug: string}>}) {
 const {slug} = await params;
 const article = getArticles(await getSiteContent()).find(item => item.slug === slug);
 return {title: article?.title || 'Story not found', description: article?.excerpt, ...canonicalMetadata(`/journal/${slug}`)};
}

export default async function Article({params}: {params: Promise<{slug: string}>}) {
 const {slug} = await params;
 const content=await getSiteContent();
 const articles = getArticles(content);
 const reader=section(content,'journal-reader');
 const closing=section(content,'journal-article-closing');
 const relatedContent=section(content,'journal-related');
 const article = articles.find(item => item.slug === slug);
 if (!article) notFound();
 const related = articles.filter(item => item.slug !== slug)
  .sort((a, b) => Number(b.category === article.category) - Number(a.category === article.category)).slice(0, 3);
 return <div className={styles.articlePage}>
  <nav className={styles.articleBreadcrumb} aria-label="Breadcrumb">
   <Link href="/journal"><ArrowLeft size={15}/> The journal</Link><span aria-hidden="true">/</span>
   <Link href={`/journal?category=${encodeURIComponent(article.category)}`}>{article.category}</Link>
  </nav>
  <article>
   <header className={styles.articleHeader}>
    <p className={styles.kicker}>{reader.eyebrow||'NOTES FROM THE ATELIER'}</p>
    <h1>{article.title}</h1>
    {article.excerpt && <p className={styles.articleStandfirst}>{article.excerpt}</p>}
    <div className={styles.articleMeta}><span>{article.category}</span><span><Clock3 size={14}/>{article.readTime}</span></div>
   </header>
   <figure className={styles.articleFigure}>
    <div><Image mobileSrc={article.mobileImage} src={article.image || '/images/botanical-study.webp'} alt={article.imageAlt || article.title} fill sizes="(max-width: 760px) 92vw, 86vw" preload style={{objectPosition:article.imagePosition||'center'}}/></div>
    {article.imageCaption && <figcaption>{article.imageCaption}</figcaption>}
   </figure>
   <JournalReader>
    <aside className={styles.readingAside}>
     <p className={styles.kicker}>{reader.title||'IN THIS STORY'}</p>
     <nav aria-label="In this story">
      <a href="#opening">{reader.caption||'A place to begin'}</a>
      {article.sections?.map((part, index) => <a href={`#chapter-${index + 1}`} key={part.heading}>{part.heading}</a>)}
      {article.takeaway && <a href="#a-small-invitation">{reader.note||'A small invitation'}</a>}
     </nav>
     <Link href={reader.linkUrl||'/journal'} className={styles.backLink}><ArrowLeft size={15}/> {reader.linkLabel||'Back to the journal'}</Link>
    </aside>
    <div className={styles.articleBody}>
     <div id="opening" className={styles.opening}>{article.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
     {article.sections?.map((part, index) => <section key={part.heading} id={`chapter-${index + 1}`}>
      <span className={styles.chapterNumber}>{String(index + 1).padStart(2, '0')}</span>
      <h2>{part.heading}</h2>
      {part.paragraphs.map((paragraph, pIndex) => <p key={pIndex}>{paragraph}</p>)}
     </section>)}
     {article.takeaway && <aside id="a-small-invitation" className={styles.takeaway}>
      <Leaf size={25} strokeWidth={1.2} aria-hidden="true"/>
      <div><p className={styles.kicker}>{reader.note||'A SMALL INVITATION'}</p><p>{article.takeaway}</p></div>
     </aside>}
     {closing.enabled!==false&&<div className={styles.articleEnd}><span aria-hidden="true">✳</span><p style={{whiteSpace:'pre-line'}}>{closing.body||'A little nature. A human touch.\nThank you for spending a moment here.'}</p><Link href={closing.linkUrl||'/shop'} className={styles.inlineLink}>{closing.linkLabel||'Find your everyday ritual'} <ArrowUpRight size={17}/></Link></div>}
    </div>
   </JournalReader>
  </article>

  {relatedContent.enabled!==false&&related.length > 0 && <section className={styles.related} aria-labelledby="related-stories-title">
   <div className={styles.archiveHeading}><div><p className={styles.kicker}>{relatedContent.eyebrow||'KEEP THE CURIOSITY GOING'}</p><h2 id="related-stories-title">{relatedContent.title||'Another little'} <em>{relatedContent.titleEmphasis||'discovery.'}</em></h2></div><Link href={relatedContent.linkUrl||'/journal'} className={styles.inlineLink}>{relatedContent.linkLabel||'All stories'} <ArrowUpRight size={17}/></Link></div>
   <div className={styles.storyGrid}>{related.map(item => <article className={styles.storyCard} key={item.slug}>
    <Link href={`/journal/${item.slug}`} className={styles.storyImage} aria-label={`Read ${item.title}`}>
     <Image mobileSrc={item.mobileImage} src={item.image || '/images/botanical-study.webp'} alt={item.imageAlt || item.title} fill sizes="(max-width: 650px) 90vw, (max-width: 1000px) 44vw, 29vw" style={{objectPosition:item.imagePosition||'center'}}/>
     <span className={styles.cardArrow} aria-hidden="true"><ArrowUpRight size={21}/></span>
    </Link>
    <div className={styles.storyCopy}><div className={styles.meta}><span>{item.category}</span><span>{item.readTime}</span></div><h3><Link href={`/journal/${item.slug}`}>{item.title}</Link></h3><p>{item.excerpt}</p><Link href={`/journal/${item.slug}`} className={styles.inlineLink} aria-label={`Read the story: ${item.title}`}>{relatedContent.secondaryLabel||'Read the story'} <ArrowUpRight size={16}/></Link></div>
   </article>)}</div>
  </section>}
 </div>;
}
