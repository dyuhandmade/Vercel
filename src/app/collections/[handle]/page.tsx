import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import {getCollection} from '@/lib/shopify';
import Catalog from '@/components/Catalog';
export async function generateMetadata({params}:{params:Promise<{handle:string}>}){const {handle}=await params;const c=await getCollection(handle);return {title:c?.collection.title||'Collection',alternates:{canonical:`/collections/${handle}`}};}
export default async function Collection({params}:{params:Promise<{handle:string}>}){const {handle}=await params;const data=await getCollection(handle);if(!data)notFound();return <div className="page-shell"><header className="page-intro"><p className="eyebrow">THE COLLECTION</p><h1>{data.collection.title}</h1><p>{data.collection.description}</p></header><Suspense><Catalog products={data.products}/></Suspense></div>;}
