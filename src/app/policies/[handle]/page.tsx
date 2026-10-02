import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getSiteContent,section} from '@/lib/site-content';
import {getPolicies,policyParagraphs} from '@/lib/policies';
import {safeLink} from '@/lib/content-safety';
const defaults:Record<string,{title:string;copy:string}>= {
 shipping:{title:'Shipping & returns',copy:'Contact DYU for current shipping destinations, delivery estimates, charges and return terms before placing your order.'},
 privacy:{title:'Privacy',copy:'Contact DYU for the current privacy policy and information about how your personal data is handled.'},
 terms:{title:'Terms of use',copy:'Contact DYU for the current terms of sale before placing your order.'},
 accessibility:{title:'Accessibility',copy:'The atelier supports keyboard navigation, visible focus indicators, reduced motion preferences, and text alternatives for product imagery. Interactive 3D views are optional, with rotation buttons and a static image alternative. We will continue to review the experience across browsers and assistive technologies before launch.'}
};
export async function generateMetadata({params}:{params:Promise<{handle:string}>}){const {handle}=await params;const content=await getSiteContent();return {title:section(content,`policy-${handle}`).title||defaults[handle]?.title};}
export default async function Policy({params}:{params:Promise<{handle:string}>}){
 const {handle}=await params;const fallback=defaults[handle];if(!fallback)notFound();
 const [content,native]=await Promise.all([getSiteContent(),getPolicies()]);const copy=section(content,`policy-${handle}`);
 const policies=(handle==='privacy'?[native.privacyPolicy]:handle==='terms'?[native.termsOfService]:handle==='shipping'?[native.shippingPolicy,native.refundPolicy]:[]).filter(item=>item&&item.body.trim());
 return <div className="page-shell narrow"><header className="page-intro"><p className="eyebrow">{copy.eyebrow||'THE DETAILS'}</p><h1>{copy.title||fallback.title}</h1></header><div className="prose">{policies.length?policies.map(policy=>policy&&<section key={policy.url}>{policies.length>1&&<h2>{policy.title}</h2>}{policyParagraphs(policy.body).map((paragraph,index)=><p key={index} style={{whiteSpace:'pre-line'}}>{paragraph}</p>)}{safeLink(policy.url)&&<a href={safeLink(policy.url)} className="text-link" target="_blank" rel="noopener noreferrer">View the original {policy.title.toLowerCase()}</a>}</section>):(copy.body||fallback.copy).split(/\n\s*\n/).map((paragraph,index)=><p key={index} style={{whiteSpace:'pre-line'}}>{paragraph}</p>)}<Link href="/contact" className="text-link">Get in touch</Link></div></div>;
}
