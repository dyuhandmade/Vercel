import Link from 'next/link';
import {getSiteContent,section} from '@/lib/site-content';
export default async function NotFound(){
 const copy=section(await getSiteContent(),'not-found-page');
 return <div className="page-shell"><div className="empty-state"><p className="eyebrow">{copy.eyebrow||'A LITTLE DETOUR / 404'}</p><h1>{copy.title||'Let’s find your'}{' '}<em>{copy.titleEmphasis||'way back.'}</em></h1><p>{copy.body||'This page is no longer here. There is plenty more to explore.'}</p><Link href={copy.linkUrl||'/shop'} className="button">{copy.linkLabel||'Return to the collection'}</Link></div></div>;
}
