import type {Metadata} from 'next';
import {getSiteContent} from '@/lib/site-content';
import './globals.css';
import './atelier.css';
import './story.css';
import './content-editing.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {StoreProvider} from '@/components/StoreProvider';
import {getCollections,getProducts,isDemo,discoveryCollections} from '@/lib/shopify';
export const dynamic='force-dynamic';
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000'),title:{default:'DYUhandmade — A slower kind of care',template:'%s | DYUhandmade'},description:'Discover the DYUhandmade digital atelier. Thoughtful botanical care, everyday rituals, and the stories behind them.',robots:process.env.DEMO_MODE==='true'?{index:false,follow:false}:{index:true,follow:true}};
export default async function RootLayout({children}:{children:React.ReactNode}){const demo=isDemo();const [products,collections,content]=await Promise.all([getProducts().catch(()=>[]),getCollections().catch(()=>[]),getSiteContent()]);return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a><StoreProvider demo={demo}><Header content={content} products={products.map(({title,handle,productType})=>({title,handle,productType}))} collections={discoveryCollections(products,collections)}/><main id="main">{children}</main><Footer content={content}/>{demo&&<div className="preview-label">DESIGN PREVIEW · Illustrative products & imagery</div>}</StoreProvider></body></html>;}
