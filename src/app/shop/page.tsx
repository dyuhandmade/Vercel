import {Suspense} from 'react';
import Link from 'next/link';
import {getProducts,getCollections,discoveryCollections} from '@/lib/shopify';
import {getSiteContent,section} from '@/lib/site-content';
import {canonicalMetadata} from '@/lib/seo';
import Catalog from '@/components/Catalog';
import CollectionHero,{CollectionHeroPlaceholder} from '@/components/CollectionHero';
export const metadata={title:'The collection',...canonicalMetadata('/shop')};
export default async function Shop(){
 const [products,collections,content]=await Promise.all([getProducts(),getCollections(),getSiteContent()]);
 const intro=section(content,'shop-page'),hero=section(content,'shop-hero');
 const configuredCollections=(intro.collectionHandles||[]).map(handle=>collections.find(collection=>collection.handle===handle)).filter(collection=>!!collection);
 const discovery=configuredCollections.length?configuredCollections:discoveryCollections(products,collections);
 const typeContent=Object.fromEntries(Object.entries(content.sections).filter(([handle])=>handle.startsWith('shop-hero-')));
 return <div className="page-shell">
  <header className="shop-editorial-intro" data-copy-visible={intro.enabled!==false}>
   {intro.enabled!==false&&<div><p className="eyebrow">{intro.eyebrow||'THE DYU COLLECTION'}</p><h1 className="content-lines">{intro.title||'A ritual for'}<br/><em>{intro.titleEmphasis||'every kind of day.'}</em></h1><p className="content-lines">{intro.body||'For the morning light. For the quiet evening.\nFor a small moment that belongs to you.'}</p><nav className="shop-entrance-links" aria-label="Discover collections">{discovery.map(c=><Link key={c.handle} href={c.href||`/collections/${c.handle}`}>{c.title}</Link>)}</nav>{intro.linkLabel&&intro.linkUrl&&<Link className="text-link" href={intro.linkUrl}>{intro.linkLabel}</Link>}</div>}
   <Suspense fallback={<div className="collection-hero-stage"><CollectionHeroPlaceholder/></div>}><CollectionHero content={hero} typeContent={typeContent} products={products.map(({id,handle,title,productType,tags,shape,tone,image,images,model,ingredients,demo})=>({id,handle,title,productType,tags,shape,tone,image,images,model,ingredients,demo}))}/></Suspense>
  </header>
  <Suspense fallback={<p>Preparing the collection…</p>}><Catalog products={products}/></Suspense>
 </div>;
}
