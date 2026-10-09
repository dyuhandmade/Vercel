import {Suspense} from 'react';
import Catalog from '@/components/Catalog';
import {getProducts} from '@/lib/shopify';
import {getSiteContent,section} from '@/lib/site-content';
import {storefrontIndexable} from '@/lib/seo';
export const metadata={title:'Find your ritual',robots:{index:false,follow:storefrontIndexable()}};
export default async function Search({searchParams}:{searchParams:Promise<{q?:string}>}){
 const {q=''}=await searchParams;
 const [products,content]=await Promise.all([getProducts(),getSiteContent()]);
 const intro=section(content,'search-page');
 return <div className="page-shell"><header className="page-intro compact"><p className="eyebrow">{intro.eyebrow||'A LITTLE DISCOVERY'}</p><h1>{intro.title||'Find your'} <em>{intro.titleEmphasis||'ritual.'}</em></h1>{intro.body&&<p className="content-lines">{intro.body}</p>}</header><Suspense><Catalog products={products} initialQuery={q} searchMode/></Suspense></div>;
}
