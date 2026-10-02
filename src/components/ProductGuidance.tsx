import Link from 'next/link';
import {ArrowUpRight,Plus} from 'lucide-react';
import type {Product} from '@/lib/types';

export default function ProductGuidance({product:p}:{product:Product}){
 const ingredients=p.fullIngredientList||p.ingredients.map(item=>item.name||item.title).filter(Boolean).join(', ');
 const hasDirections=!p.demo&&p.ritual.some(item=>item.description?.trim());
 return <section className="story-confidence section product-guidance" id="care">
  <div><span className="eyebrow">BEFORE IT BECOMES YOURS</span><h2>A little clarity.<br/><em>A considered choice.</em></h2><Link className="guidance-conversation" href="/contact">Ask DYU a question <ArrowUpRight size={17}/></Link></div>
  <div className="guidance-questions">
   <details name={`guidance-${p.handle}`}><summary><span>What’s inside?</span><Plus size={19}/></summary><div>{ingredients?<><p style={{whiteSpace:'pre-line'}}>{ingredients}</p>{p.ingredients.length>0&&<a href="#ingredients">Explore each ingredient <ArrowUpRight size={15}/></a>}</>:p.demo?<><p>The ingredients in this design preview are botanical studies. The confirmed formulation will accompany the final product.</p><a href="#ingredients">Revisit the botanical study <ArrowUpRight size={15}/></a></>:<><p>{p.description||'A full ingredient list has not been added to this product yet.'}</p><Link href="/contact">Ask DYU for the complete ingredient list <ArrowUpRight size={15}/></Link></>}</div></details>
   {p.careNotes&&<details name={`guidance-${p.handle}`}><summary><span>Care & storage</span><Plus size={19}/></summary><div><p style={{whiteSpace:'pre-line'}}>{p.careNotes}</p></div></details>}
   <details name={`guidance-${p.handle}`}><summary><span>How do I make it part of my routine?</span><Plus size={19}/></summary><div>{hasDirections?<><p>The product’s directions are available in Your ritual. Follow the directions supplied with your product.</p><a href="#ritual">See the product directions <ArrowUpRight size={15}/></a></>:p.demo?<><p>Choose a moment in Your ritual to explore how a pause could fit your day. Product-use directions will be added with the final catalogue.</p><a href="#ritual">Choose your moment <ArrowUpRight size={15}/></a></>:<><p>Directions for this product are not available here yet. Ask DYU how to use it and follow the directions supplied with your product.</p><Link href="/contact">Ask about the product ritual <ArrowUpRight size={15}/></Link></>}</div></details>
   <details name={`guidance-${p.handle}`}><summary><span>{p.demo?'Can I order this product?':'Delivery & returns'}</span><Plus size={19}/></summary><div><p>{p.demo?'You can try the preview bag. Orders and payments are not yet enabled. Shipping and return details will be confirmed before the shop opens.':'Review the available delivery and return information before placing your order.'}</p><Link href="/policies/shipping">Shipping & returns <ArrowUpRight size={15}/></Link></div></details>
  </div>
 </section>;
}
