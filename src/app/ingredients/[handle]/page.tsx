import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getProducts} from '@/lib/shopify';
import ProductCard from '@/components/ProductCard';
export default async function Ingredient({params}:{params:Promise<{handle:string}>}){const {handle}=await params;const all=await getProducts();const related=all.filter(p=>p.ingredients.some(i=>(i.handle||i.name)===decodeURIComponent(handle)));const item=related.flatMap(p=>p.ingredients).find(i=>(i.handle||i.name)===decodeURIComponent(handle));if(!item)notFound();return <div className="page-shell"><header className="page-intro"><Link href="/ingredients" className="eyebrow">THE INGREDIENT ATLAS</Link><h1>{item.name}</h1><p>{item.description}</p></header><h2>Find it in your ritual.</h2><div className="product-grid">{related.map(p=><ProductCard product={p} key={p.id}/>)}</div></div>;}
