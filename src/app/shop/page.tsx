import {Suspense} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {getProducts,getCollections,discoveryCollections} from '@/lib/shopify';
import Catalog from '@/components/Catalog';
export const metadata={title:'The collection',alternates:{canonical:'/shop'}};
export default async function Shop(){
 const [products,collections]=await Promise.all([getProducts(),getCollections()]);
 const discovery=discoveryCollections(products,collections);
 return <div className="page-shell">
  <header className="shop-editorial-intro">
   <div><p className="eyebrow">THE DYU COLLECTION</p><h1>A ritual for<br/><em>every kind of day.</em></h1><p>For the morning light. For the quiet evening.<br/>For a small moment that belongs to you.</p><nav className="shop-entrance-links" aria-label="Discover collections">{discovery.map(c=><Link key={c.handle} href={c.href||`/collections/${c.handle}`}>{c.title}</Link>)}</nav></div>
   <div className="shop-intro-photo editorial-media"><Image src={products[0]?.image||'/images/atelier-ritual-v2.webp'} alt={products[0]?.title||'Illustrative care vessels and linen in warm morning light'} fill priority sizes="(max-width:800px) 90vw, 45vw"/><span className="image-footnote">THE EVERYDAY / THE DYU COLLECTION</span></div>
  </header>
  <Suspense fallback={<p>Preparing the collection…</p>}><Catalog products={products}/></Suspense>
 </div>;
}
