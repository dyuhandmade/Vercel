import type { MetadataRoute } from 'next';
import {isDemo} from '@/lib/shopify';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',...(isDemo()?{disallow:'/'}:{allow:'/',disallow:['/cart','/api/','/search']})},sitemap:`${process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000'}/sitemap.xml`};}
