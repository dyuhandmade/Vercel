import {editableText} from '@/lib/content-safety';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowDown} from 'lucide-react';
import {getProduct,getProducts} from '@/lib/shopify';
import {getSiteContent,section} from '@/lib/site-content';
import {money} from '@/lib/types';
import {canonicalMetadata,stableSiteOrigin,storefrontIndexable} from '@/lib/seo';
import Gallery from '@/components/Gallery';
import SimilarProducts from '@/components/SimilarProducts';
import {rankSimilarProducts} from '@/lib/product-recommendations';
import ChapterNav from '@/components/ChapterNav';
import ProductStory from '@/components/ProductStory';
import SavedProductButton from '@/components/SavedProductButton';
import ProductViewTracker from '@/components/ProductViewTracker';
export async function generateMetadata({params}:{params:Promise<{handle:string}>}){const {handle}=await params;const p=await getProduct(handle);return {title:p?.title||'Product not found',description:p?.story||p?.description||(p?`Explore ${p.title} from DYUhandmade. View product photographs, available options, and shipping information.`:undefined),...canonicalMetadata(`/products/${handle}`)};}
export default async function ProductPage({params}:{params:Promise<{handle:string}>}){
 const {handle}=await params;const [p,content,products]=await Promise.all([getProduct(handle),getSiteContent(),getProducts()]);if(!p)notFound();const related=rankSimilarProducts(p,products);
 const intro=section(content,'product-page');
 const t=(key:string,fallback:string)=>editableText(content,key,fallback);
 const chapters=[{id:'origin',label:t("product-chapter-invitation","The invitation")},...((p.demo||p.craft.length)&&section(content,'product-craft').enabled!==false?[{id:'craft',label:t("product-chapter-craft","The making")}]:[]),...((p.demo||p.ingredients.length)&&section(content,'product-ingredients').enabled!==false?[{id:'ingredients',label:t("product-chapter-ingredients","Look within")}]:[]),...(p.demo||p.ritual.length?[{id:'ritual',label:t("product-chapter-ritual","Your ritual")}]:[]),{id:'care',label:t("product-chapter-guidance","A little guidance")}];
 return <div className="product-journey-page"><ProductViewTracker handle={p.handle}/><div className="breadcrumb"><Link href="/">{t("breadcrumb-home","The atelier")}</Link><span>/</span><Link href="/shop">{t("breadcrumb-shop","The collection")}</Link><span>/</span><span>{p.title}</span></div>
 <section className="product-exhibit" id="product-introduction"><Gallery product={p}/><div className="exhibit-introduction"><p className="eyebrow">{p.productType} / {intro.eyebrow||'AN EVERYDAY OBJECT, RECONSIDERED'}</p><h1>{p.title}</h1><p className="exhibit-story">{p.story}</p><div className="exhibit-actions"><a href={intro.linkUrl||'#origin'} className="exhibit-discover">{intro.linkLabel||'Enter the experience'} <ArrowDown size={17}/></a><a href={intro.secondaryUrl||'#purchase'} className="text-link">{intro.secondaryLabel||'Make it yours'} · {money(p.price)}</a></div><SavedProductButton handle={p.handle} title={p.title}/>{p.demo&&<span className="exhibit-preview">Design study · Illustrative product, packaging & price</span>}</div></section>
 <ChapterNav chapters={chapters} title={p.title}/>
 <ProductStory product={p} content={content}/>
 <SimilarProducts recommendations={related} content={section(content,'product-related')}/>
 {!p.demo&&storefrontIndexable()&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'Product',name:p.title,description:p.description,image:p.images.map(i=>i.url),offers:{'@type':'Offer',price:p.price.amount,priceCurrency:p.price.currencyCode,availability:`https://schema.org/${p.availableForSale?'InStock':'OutOfStock'}`,url:`${stableSiteOrigin()}/products/${p.handle}`}}).replace(/</g,'\\u003c')}}/>}</div>;
}
