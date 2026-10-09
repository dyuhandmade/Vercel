import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import {getCollection} from '@/lib/shopify';
import {getSiteContent,section} from '@/lib/site-content';
import {inheritHeroContent} from '@/lib/hero-content';
import {canonicalMetadata} from '@/lib/seo';
import Catalog from '@/components/Catalog';
import CollectionHero,{CollectionHeroPlaceholder} from '@/components/CollectionHero';
export async function generateMetadata({params}:{params:Promise<{handle:string}>}){const {handle}=await params;const c=await getCollection(handle);return {title:c?.collection.title||'Collection',description:c?.collection.description||(c?`Explore ${c.collection.title} from DYUhandmade. Discover the products, photographs, and available options in this collection.`:undefined),...canonicalMetadata(`/collections/${handle}`)};}
export default async function Collection({params}:{params:Promise<{handle:string}>}){
 const {handle}=await params;
 const [data,content]=await Promise.all([getCollection(handle),getSiteContent()]);
 if(!data)notFound();
 const hero=inheritHeroContent(section(content,'collection-page'),section(content,`collection-${handle}`));
 const nativeImage=data.collection.image;
 const hasVisual=Boolean(hero.image||hero.mobileImage||nativeImage||hero.displayMode||hero.productHandles?.length);
 return <div className="page-shell">
  {hero.enabled!==false&&<header className={`${hasVisual?'shop-editorial-intro':'page-intro'} collection-page-intro`}>
   <div><p className="eyebrow">{hero.eyebrow||'THE COLLECTION'}</p><h1 className="content-lines">{hero.title||data.collection.title}{hero.titleEmphasis&&<><br/><em>{hero.titleEmphasis}</em></>}</h1><p className="content-lines">{hero.body||data.collection.description}</p></div>
   {hasVisual&&<Suspense fallback={<div className="collection-hero-stage"><CollectionHeroPlaceholder/></div>}><CollectionHero content={hero} nativeImage={nativeImage} products={data.products.map(({id,handle,title,productType,tags,shape,tone,image,images,model,ingredients,demo})=>({id,handle,title,productType,tags,shape,tone,image,images,model,ingredients,demo}))}/></Suspense>}
  </header>}
  <Suspense><Catalog products={data.products}/></Suspense>
 </div>;
}
