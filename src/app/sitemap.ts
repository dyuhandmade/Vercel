import type {MetadataRoute} from 'next';
import {getProducts,getCollections,isDemo} from '@/lib/shopify';
export const dynamic='force-dynamic';
import {getArticles} from '@/lib/journal';
import {getSiteContent} from '@/lib/site-content';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{if(isDemo())return [];const base=process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000';const [products,collections,content]=await Promise.all([getProducts(),getCollections(),getSiteContent()]);const articles=getArticles(content);return ['','/shop','/our-story','/how-its-made','/ingredients','/journal','/contact','/faq',...products.map(p=>`/products/${p.handle}`),...collections.map(c=>`/collections/${c.handle}`),...articles.map(a=>`/journal/${a.slug}`)].map(p=>({url:base+p}));}
