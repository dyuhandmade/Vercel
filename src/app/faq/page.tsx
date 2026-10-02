import Link from 'next/link';
import {getSiteContent,section} from '@/lib/site-content';
export const metadata={title:'A little guidance'};
const defaults=[
 {handle:'faq-find-a-ritual',title:'How do I find the right ritual?',body:'Start with the collection and choose a product category. Each product page brings together its story, available options, and product information so you can explore at your own pace.'},
 {handle:'faq-ingredients',title:'Where can I read the ingredient list?',body:'Read the product description and ingredient story on each product page. If you need the complete formulation or further details, contact DYU before choosing a product.'},
 {handle:'faq-3d',title:'Can I look at products in 3D?',body:'Where available, the product viewer lets you rotate a study based on the main product photograph. Unseen surfaces are approximations. The original product photos remain available in the gallery.'},
 {handle:'faq-orders',title:'How do I place an order?',body:'Select an available product option and add it to your bag. Checkout continues securely with Shopify. If an item is unavailable, contact DYU for more information.'},
 {handle:'faq-delivery',title:'What are the shipping and return options?',body:'Visit Shipping & returns for the information currently available, or contact DYU about your delivery location and return questions before placing an order.'},
];
export default async function Faq(){
 const content=await getSiteContent(),intro=section(content,'faq-page');
 const saved=Object.values(content.sections).filter(item=>item.handle.startsWith('faq-')&&item.handle!=='faq-page');
 const handles=intro.items?.length?intro.items:[...defaults.map(item=>item.handle),...saved.map(item=>item.handle).filter(handle=>!defaults.some(item=>item.handle===handle))];
 const faqs=handles.map(handle=>{const fallback=defaults.find(item=>item.handle===handle),saved=content.sections[handle];return {...saved,handle,title:saved?.title||fallback?.title,body:saved?.body||fallback?.body};}).filter(item=>item.enabled!==false&&item.title&&item.body).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
 return <div className="page-shell"><header className="page-intro"><p className="eyebrow">{intro.eyebrow||'A LITTLE GUIDANCE'}</p><h1>{intro.title||'Good questions.'}<br/><em>{intro.titleEmphasis||'Thoughtful answers.'}</em></h1>{intro.body&&<p>{intro.body}</p>}</header><div className="support-layout"><nav className="support-nav"><Link href="/contact">Get in touch</Link><Link href="/policies/shipping">Shipping & returns</Link><Link href="/shop">Explore the collection</Link></nav><div>{faqs.map(item=><details key={item.handle} className="faq-item"><summary>{item.title}</summary><p style={{whiteSpace:'pre-line'}}>{item.body}</p></details>)}</div></div></div>;
}
