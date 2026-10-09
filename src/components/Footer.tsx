import Link from 'next/link';
import BrandLogo from './BrandLogo';
import {catalogueUrl} from '@/lib/atelier';
import type {SiteContent} from '@/lib/site-content';
import {navigationItems} from '@/lib/navigation-content';

export default function Footer({content}:{content?:SiteContent}){
 const brand=content?.sections['brand'],copy=content?.sections['footer'],philosophy=content?.sections['footer-philosophy'];
 const explore=navigationItems(content,'navigation-footer-explore',['collection','story','ingredients','making'],{ingredients:'Ingredient atlas'});
 const guidance=navigationItems(content,'navigation-footer-guidance',['faq','contact','shipping','journal']);
 const legal=navigationItems(content,'navigation-footer-legal',['privacy','terms','accessibility']);
 const links=(items:ReturnType<typeof navigationItems>)=>items.map(item=><Link key={item.key} href={item.href}>{item.label}</Link>);
 const catalogue=content?.sections['footer-catalogue'],contact=content?.sections['contact'];
 if(copy?.enabled===false)return null;
 return <footer className="site-footer"><div className="footer-top">
  <div><BrandLogo footer content={brand}/><p style={{whiteSpace:'pre-line'}}>{copy?.body||'Room for nature.\nTime for yourself.'}</p></div>
  {explore.length>0&&<div><span className="eyebrow">{content?.sections['navigation-footer-explore']?.title||copy?.title||'Explore'}</span>{links(explore)}</div>}
  {(guidance.length>0||catalogue?.enabled!==false)&&<div><span className="eyebrow">{content?.sections['navigation-footer-guidance']?.title||copy?.titleEmphasis||'A little guidance'}</span>{links(guidance)}{catalogue?.enabled!==false&&<a href={catalogue?.linkUrl||contact?.secondaryUrl||catalogueUrl} target="_blank" rel="noopener noreferrer">{catalogue?.linkLabel||contact?.secondaryLabel||'WhatsApp catalogue'} ↗</a>}</div>}
  {philosophy?.enabled!==false&&<div className="footer-note"><span className="eyebrow">{philosophy?.title||'The DYU philosophy'}</span><p style={{whiteSpace:'pre-line'}}>{philosophy?.body||'Thoughtful care.\nEveryday rituals.\nA slower way of being.'}</p></div>}
 </div><div className="footer-bottom"><span>© {new Date().getFullYear()} {brand?.caption||'DYUhandmade'}</span><div>{links(legal)}</div><span>{copy?.note||'Made with intention.'}</span></div></footer>;
}
