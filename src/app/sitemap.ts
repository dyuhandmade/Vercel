import type {MetadataRoute} from 'next';
import {getProducts,getCollections} from '@/lib/shopify';
import {stableSiteOrigin,storefrontIndexable} from '@/lib/seo';
export const dynamic='force-dynamic';
import {getArticles} from '@/lib/journal';
import {getSiteContent} from '@/lib/site-content';
import {buildIngredientIndex} from './ingredients/ingredient-data';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{if(!storefrontIndexable())return [];const base=stableSiteOrigin()!;const [products,collections,content]=await Promise.all([getProducts(),getCollections(),getSiteContent()]);const articles=getArticles(content);return ['','/shop','/our-story','/how-its-made','/ingredients','/journal','/contact','/faq',...products.map(p=>`/products/${p.handle}`),...collections.map(c=>`/collections/${c.handle}`),...articles.map(a=>`/journal/${a.slug}`),...buildIngredientIndex(products,content).map(item=>`/ingredients/${item.handle}`)].map(p=>({url:base+p}));}
