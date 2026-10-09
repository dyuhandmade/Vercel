import Link from 'next/link';
import BrandLogo from './BrandLogo';
import {catalogueUrl} from '@/lib/atelier';
import type {SiteContent} from '@/lib/site-content';

export default function Footer({content}:{content?:SiteContent}){
 const brand=content?.sections['brand'],copy=content?.sections['footer'],philosophy=content?.sections['footer-philosophy'];
 const nav=(key:string,title:string,href:string)=>{
  const item=content?.sections[`nav-${key}`];
  if(item?.enabled===false)return null;
  return <Link key={key} href={item?.linkUrl||href}>{item?.title||title}</Link>;
 };
 if(copy?.enabled===false)return null;
 return <footer className="site-footer"><div className="footer-top">
  <div><BrandLogo footer content={brand}/><p style={{whiteSpace:'pre-line'}}>{copy?.body||'Room for nature.\nTime for yourself.'}</p></div>
  <div><span className="eyebrow">{copy?.title||'Explore'}</span>{nav('collection','The collection','/shop')}{nav('story','Our story','/our-story')}{nav('ingredients','Ingredient atlas','/ingredients')}{nav('making','How it is made','/how-its-made')}</div>
  <div><span className="eyebrow">{copy?.titleEmphasis||'A little guidance'}</span>{nav('faq','Frequently asked questions','/faq')}{nav('contact','Get in touch','/contact')}{nav('shipping','Shipping & returns','/policies/shipping')}{nav('journal','The journal','/journal')}<a href={content?.sections['contact']?.secondaryUrl||catalogueUrl} target="_blank" rel="noopener noreferrer">{content?.sections['contact']?.secondaryLabel||'WhatsApp catalogue'} ↗</a></div>
  {philosophy?.enabled!==false&&<div className="footer-note"><span className="eyebrow">{philosophy?.title||'The DYU philosophy'}</span><p style={{whiteSpace:'pre-line'}}>{philosophy?.body||'Thoughtful care.\nEveryday rituals.\nA slower way of being.'}</p></div>}
 </div><div className="footer-bottom"><span>© {new Date().getFullYear()} {brand?.caption||'DYUhandmade'}</span><div>{nav('privacy','Privacy','/policies/privacy')}{nav('terms','Terms','/policies/terms')}{nav('accessibility','Accessibility','/policies/accessibility')}</div><span>{copy?.note||'Made with intention.'}</span></div></footer>;
}
