import Image from 'next/image';
import Link from 'next/link';
import {configuredBrandLogo} from '@/lib/brand';
import type {ContentSection} from '@/lib/site-content';

export default function BrandLogo({footer=false,content}:{footer?:boolean;content?:ContentSection}){
 return <Link href={content?.linkUrl||'/'} aria-label={content?.linkLabel||`${content?.caption||'DYUhandmade'} home`} className={`wordmark brand-logo${footer?' footer-brand':''}`}>
  <Image {...configuredBrandLogo(content)} unoptimized preload={!footer} sizes={footer?'(max-width: 540px) 118px, 148px':'(max-width: 540px) 96px, 116px'}/>
 </Link>;
}
