import Link from 'next/link';
import {getSiteContent,section} from '@/lib/site-content';
import CraftJourney from '@/components/CraftJourney';
import ProductCard from '@/components/ProductCard';
import ContentImage from '@/components/ContentImage';
import {getProducts,isDemo} from '@/lib/shopify';
import {ArrowUpRight} from 'lucide-react';
export const metadata={title:'The art of making'};
export default async function Craft(){
 const [products,content]=await Promise.all([getProducts(),getSiteContent()]);
 const intro=section(content,'craft-page');
 const heading=content.sections['craft-journey']||section(content,'home-craft');
 const selection=section(content,'craft-products');
 const selectedProducts=selection.productHandles?.length?selection.productHandles.flatMap(handle=>products.find(product=>product.handle===handle)||[]):products;
 const withCraft=selectedProducts.filter(product=>product.craft.length>0);
 const onward=[
  {handle:'craft-onward-ingredients',eyebrow:'KEEP A LITTLE CURIOSITY',title:'Meet the botanicals',link:'/ingredients'},
  {handle:'craft-onward-shop',eyebrow:'THE NEXT CHAPTER IS YOURS',title:'Find your everyday ritual',link:'/shop'},
 ].filter(item=>content.sections[item.handle]?.enabled!==false);
 return <div className="page-shell craft-page">
  <header className="page-intro"><p className="eyebrow">{intro.eyebrow||'INSIDE THE ATELIER'}</p><h1>{intro.title||'From raw ingredients.'}<br/><em>{intro.titleEmphasis||'To everyday care.'}</em></h1><p>{intro.body||(withCraft.length||isDemo()?'Follow the care and craft behind each object.':'The product making stories will appear here as DYU adds them to Shopify.')}</p></header>
  {(intro.image||intro.mobileImage)&&<div style={{position:'relative',aspectRatio:'16/9',marginBottom:40}}><ContentImage src={intro.image||intro.mobileImage!} mobileSrc={intro.mobileImage} alt={intro.imageAlt||'Inside the DYU atelier'} fill sizes="90vw" style={{objectFit:'cover',objectPosition:intro.imagePosition||'center'}}/></div>}
  {heading.enabled!==false&&(withCraft.length?<CraftJourney content={heading} items={withCraft[0].craft} product={withCraft[0]}/>:isDemo()||heading.image||heading.mobileImage?<CraftJourney content={heading}/>:null)}
  {selection.enabled!==false&&<div className="product-grid">{(withCraft.length?withCraft:selectedProducts.slice(0,3)).map(product=><ProductCard product={product} key={product.id}/>)}</div>}
  {onward.length>0&&<nav className="making-onward" aria-label="Continue your atelier visit">{onward.map(item=>{const saved=content.sections[item.handle];return <Link key={item.handle} href={saved?.linkUrl||item.link}><span>{saved?.eyebrow||item.eyebrow}</span><strong>{saved?.title||item.title}</strong><ArrowUpRight size={23}/></Link>;})}</nav>}
 </div>;
}
