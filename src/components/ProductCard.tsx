import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { Product } from '@/lib/types';
import {money} from '@/lib/types';
import ProductVisual from './ProductVisual';
export default function ProductCard({product:p,index=0,duplicate=false}:{product:Product;index?:number;duplicate?:boolean}){return <article className="product-card"><Link href={`/products/${p.handle}`} tabIndex={duplicate?-1:undefined} className={`product-card-art tone-${index%3}`} aria-label={`Discover ${p.title}`}><ProductVisual shape={p.shape} tone={p.tone} image={p.image} title={p.title}/><span className="card-caption">{p.demo?'ATELIER PREVIEW':p.availableForSale?'EXPLORE THE RITUAL':'SOLD OUT'}</span><span className="card-plus"><Plus size={19}/></span></Link><div className="product-card-meta"><div><span className="eyebrow">{p.productType}</span><h3><Link href={`/products/${p.handle}`} tabIndex={duplicate?-1:undefined}>{p.title}</Link></h3></div><span className="price">{money(p.price)}</span></div></article>;}
