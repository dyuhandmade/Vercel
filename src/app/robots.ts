import type { MetadataRoute } from 'next';
import {stableSiteOrigin,storefrontIndexable} from '@/lib/seo';
export default function robots():MetadataRoute.Robots{return storefrontIndexable()?{rules:{userAgent:'*',allow:'/',disallow:['/cart','/api/','/search','/account','/model-preview']},sitemap:`${stableSiteOrigin()}/sitemap.xml`}:{rules:{userAgent:'*',disallow:'/'}};}
