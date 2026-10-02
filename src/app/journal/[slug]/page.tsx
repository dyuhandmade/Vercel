import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getArticles} from '@/lib/journal';
import {getSiteContent} from '@/lib/site-content';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const a=getArticles(await getSiteContent()).find(a=>a.slug===slug);return {title:a?.title,description:a?.excerpt};}
export default async function Article({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const a=getArticles(await getSiteContent()).find(a=>a.slug===slug);if(!a)notFound();return <article className="page-shell article"><header className="page-intro"><Link href="/journal" className="eyebrow">THE JOURNAL / {a.category}</Link><h1>{a.title}</h1><p>{a.excerpt}</p></header><div className="prose">{a.paragraphs.map(p=><p key={p}>{p}</p>)}<Link href="/shop" className="text-link">Find your everyday ritual</Link></div></article>;}
