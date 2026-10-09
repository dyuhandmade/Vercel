import {Suspense} from 'react';
import Catalog from '@/components/Catalog';
import {getProducts} from '@/lib/shopify';
import {storefrontIndexable} from '@/lib/seo';
export const metadata={title:'Find your ritual',robots:{index:false,follow:storefrontIndexable()}};
export default async function Search({searchParams}:{searchParams:Promise<{q?:string}>}){const {q=''}=await searchParams;const products=await getProducts();return <div className="page-shell"><header className="page-intro compact"><p className="eyebrow">A LITTLE DISCOVERY</p><h1>Find your <em>ritual.</em></h1></header><Suspense><Catalog products={products} initialQuery={q} searchMode/></Suspense></div>;}
