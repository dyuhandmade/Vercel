import type {Metadata} from 'next';
import {getSiteContent} from '@/lib/site-content';
import {brandLogo} from '@/lib/brand';
import {stableSiteOrigin,storefrontIndexable} from '@/lib/seo';
import './globals.css';
import './atelier.css';
import './story.css';
import './content-editing.css';
import './design-refinement.css';
import './branding.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {StoreProvider} from '@/components/StoreProvider';
import {SavedProductsProvider} from '@/components/SavedProductsProvider';
import {getCollections,getProducts,isDemo,discoveryCollections} from '@/lib/shopify';
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{
 const content=await getSiteContent(),brand=content.sections.brand,seo=content.sections['site-seo'];
 const icon=brand?.image||brandLogo.src;
 return {icons:{icon,apple:icon},metadataBase:new URL(stableSiteOrigin()||'http://localhost:3000'),title:{default:seo?.title||'DYUhandmade — A slower kind of care',template:`%s | ${brand?.caption||'DYUhandmade'}`},description:seo?.body||'Discover the DYUhandmade digital atelier. Thoughtful botanical care, everyday rituals, and the stories behind them.',...(seo?.image?{openGraph:{images:[{url:seo.image,alt:seo.imageAlt||seo.title||brand?.caption||'DYUhandmade'}]}}:{}),robots:storefrontIndexable()?{index:true,follow:true}:{index:false,follow:false}};
}
export default async function RootLayout({children}:{children:React.ReactNode}){const demo=isDemo();const [products,collections,content]=await Promise.all([getProducts().catch(()=>[]),getCollections().catch(()=>[]),getSiteContent()]);return <html lang="en" data-scroll-behavior="smooth"><body><a href="#main" className="skip-link">Skip to content</a><StoreProvider demo={demo}><SavedProductsProvider><Header nativeCollections={collections} content={content} products={products.map(({title,handle,productType})=>({title,handle,productType}))} collections={discoveryCollections(products,collections)}/><main id="main">{children}</main><Footer content={content}/>{demo&&<div className="preview-label">DESIGN PREVIEW · Illustrative products & imagery</div>}</SavedProductsProvider></StoreProvider></body></html>;}
