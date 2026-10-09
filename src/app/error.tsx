'use client';
import {useSiteContent} from '@/components/SiteContentProvider';
export default function Error({reset}:{reset:()=>void}){
 const copy=useSiteContent().sections['error-page'];
 return <div className="empty-state"><p className="eyebrow">{copy?.eyebrow||'A MOMENT PLEASE'}</p><h1>{copy?.title||'A little interruption.'}</h1><p>{copy?.body||'We couldn’t load this page. Your bag has been kept safe.'}</p><button className="button" onClick={reset}>{copy?.linkLabel||'Try again'}</button></div>;
}
