'use client';
import {useSiteContent} from './SiteContentProvider';
import {editableText} from '@/lib/content-safety';

import {useId,useRef,useState} from 'react';
import Link from 'next/link';
import {LoaderCircle,Plus,ShoppingBag,X} from 'lucide-react';
import {money,type Product,type Variant} from '@/lib/types';
import ProductVisual from './ProductVisual';
import SavedProductButton from './SavedProductButton';
import {useStore} from './StoreProvider';
import styles from './ProductCard.module.css';

export default function ProductCard({product:p,index=0,duplicate=false}:{product:Product;index?:number;duplicate?:boolean}){
 const siteContent=useSiteContent();
 const t=(key:string,fallback:string)=>editableText(siteContent,key,fallback);
 const {add,busy}=useStore();
 const [choosing,setChoosing]=useState(false),[selected,setSelected]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');
 const trigger=useRef<HTMLButtonElement>(null);
 const uid=useId();
 const available=p.variants.filter(variant=>variant.availableForSale);
 const canAdd=p.availableForSale&&available.length>0;
 const variant=available.find(item=>item.id===selected);
 const tabIndex=duplicate?-1:undefined;

 async function addVariant(item:Variant){
  setError('');setPending(true);
  try{
   const result=await add(p,item,1);
   if(result.ok)setChoosing(false);
   else setError(result.error);
  }finally{setPending(false);}
 }
 function quickAdd(){
  if(!canAdd||busy||pending)return;
  setError('');
  if(available.length===1)void addVariant(available[0]);
  else setChoosing(true);
 }
 function closeOptions(){setChoosing(false);trigger.current?.focus({preventScroll:true});}

 return <article className="product-card" data-product-handle={p.handle}>
  <div className={styles.art}>
   <Link href={`/products/${p.handle}`} tabIndex={tabIndex} className={`product-card-art tone-${index%3}`} aria-label={`Discover ${p.title}`}>
    <ProductVisual shape={p.shape} tone={p.tone} image={p.image} title={p.title}/>
    <span className="card-caption">{p.demo?'ATELIER PREVIEW':canAdd?t("card-explore","EXPLORE THE RITUAL"):t("card-unavailable","SOLD OUT")}</span>
   </Link>
   <SavedProductButton handle={p.handle} title={p.title} compact tabIndex={tabIndex}/>
   <button ref={trigger} type="button" className={styles.quickAdd} tabIndex={tabIndex} aria-label={canAdd?`Add ${p.title} to bag`:`Sold out: ${p.title}`} title={canAdd?(available.length>1?t("purchase-choose-option","Choose an option"):t("purchase-add","Add to bag")):t("purchase-sold-out","Sold out")} disabled={!canAdd||busy||pending} aria-busy={pending} aria-expanded={available.length>1?choosing:undefined} aria-controls={available.length>1&&choosing?`${uid}-options`:undefined} onClick={quickAdd}>
    {pending?<LoaderCircle size={19} className={styles.spinner} aria-hidden="true"/>:canAdd?<Plus size={19} aria-hidden="true"/>:<ShoppingBag size={18} aria-hidden="true"/>}
   </button>
  </div>
  <div className="product-card-meta"><div><span className="eyebrow">{p.productType}</span><h3><Link href={`/products/${p.handle}`} tabIndex={tabIndex}>{p.title}</Link></h3></div><span className="price">{money(p.price)}</span></div>
  {choosing&&<section id={`${uid}-options`} className={styles.options} aria-label={`Choose options for ${p.title}`} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();closeOptions();}}}>
   <button type="button" className={styles.closeOptions} tabIndex={tabIndex} aria-label={`Close options for ${p.title}`} onClick={closeOptions}><X size={17}/></button>
   <fieldset disabled={busy||pending}><legend>{t("purchase-choose-option","Choose an option")}</legend><div className={styles.variants}>
    {p.variants.map(item=><label key={item.id} className={styles.variant}>
     <input type="radio" name={`${uid}-variant`} tabIndex={tabIndex} value={item.id} checked={selected===item.id} disabled={!item.availableForSale} onChange={()=>setSelected(item.id)}/>
     <span><strong>{item.title}</strong><small>{item.availableForSale?money(item.price):t("purchase-sold-out","Sold out")}</small></span>
    </label>)}
   </div></fieldset>
   <button type="button" className={`button full ${styles.confirm}`} tabIndex={tabIndex} disabled={!variant||busy||pending} onClick={()=>variant&&void addVariant(variant)}><ShoppingBag size={16}/>{pending?t("purchase-adding","Adding to your bag…"):t("purchase-add","Add to bag")}</button>
  </section>}
  {error&&<p className={styles.error} role="alert">{error}</p>}
 </article>;
}
