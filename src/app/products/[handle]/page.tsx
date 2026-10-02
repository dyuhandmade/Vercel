import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowDown} from 'lucide-react';
import {getProduct,getProducts} from '@/lib/shopify';
import {getSiteContent} from '@/lib/site-content';
import {money} from '@/lib/types';
import Gallery from '@/components/Gallery';
import SimilarProducts from '@/components/SimilarProducts';
import {rankSimilarProducts} from '@/lib/product-recommendations';
import ChapterNav from '@/components/ChapterNav';
import ProductStory from '@/components/ProductStory';
export async function generateMetadata({params}:{params:Promise<{handle:string}>}){const {handle}=await params;const p=await getProduct(handle);return {title:p?.title||'Product not found',description:p?.story,alternates:{canonical:`/products/${handle}`}};}
export default async function ProductPage({params}:{params:Promise<{handle:string}>}){
 const {handle}=await params;const [p,content,products]=await Promise.all([getProduct(handle),getSiteContent(),getProducts()]);if(!p)notFound();const related=rankSimilarProducts(p,products);
 const chapters=[{id:'origin',label:'The invitation'},...(p.demo||p.craft.length?[{id:'craft',label:'The making'}]:[]),...(p.demo||p.ingredients.length?[{id:'ingredients',label:'Look within'}]:[]),...(p.demo||p.ritual.length?[{id:'ritual',label:'Your ritual'}]:[]),{id:'care',label:'A little guidance'}];
 return <div className="product-journey-page"><div className="breadcrumb"><Link href="/">The atelier</Link><span>/</span><Link href="/shop">The collection</Link><span>/</span><span>{p.title}</span></div>
 <section className="product-exhibit" id="product-introduction"><Gallery product={p}/><div className="exhibit-introduction"><p className="eyebrow">{p.productType} / AN EVERYDAY OBJECT, RECONSIDERED</p><h1>{p.title}</h1><p className="exhibit-story">{p.story}</p><div className="exhibit-actions"><a href="#origin" className="exhibit-discover">Enter the experience <ArrowDown size={17}/></a><a href="#purchase" className="text-link">Make it yours · {money(p.price)}</a></div>{p.demo&&<span className="exhibit-preview">Design study · Illustrative product, packaging & price</span>}</div></section>
 <ChapterNav chapters={chapters} title={p.title}/>
 <ProductStory product={p} content={content}/>
 <SimilarProducts recommendations={related}/>
 {!p.demo&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'Product',name:p.title,description:p.description,image:p.images.map(i=>i.url),offers:{'@type':'Offer',price:p.price.amount,priceCurrency:p.price.currencyCode,availability:`https://schema.org/${p.availableForSale?'InStock':'OutOfStock'}`,url:`${process.env.NEXT_PUBLIC_SITE_URL}/products/${p.handle}`}}).replace(/</g,'\\u003c')}}/>}</div>;
}
