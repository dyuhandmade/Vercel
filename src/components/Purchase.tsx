'use client';
import {useSiteContent} from './SiteContentProvider';
import {editableText} from '@/lib/content-safety';
import {useState} from 'react';
import {Minus,Plus,ShoppingBag} from 'lucide-react';
import {money,type Product} from '@/lib/types';
import {useStore} from './StoreProvider';
import {SelectedRitual} from './RitualSelection';
export default function Purchase({product:p}:{product:Product}){
 const siteContent=useSiteContent();
 const t=(key:string,fallback:string)=>editableText(siteContent,key,fallback);
 const [id,setId]=useState(p.variants.find(v=>v.availableForSale)?.id||p.variants[0]?.id),[q,setQ]=useState(1);
 const {add,busy,error}=useStore();const variant=p.variants.find(v=>v.id===id);
 const optionNames=[...new Set(p.variants.flatMap(v=>v.selectedOptions.map(option=>option.name)).filter(name=>name.toLowerCase()!=='title'))];
 const hasOptions=p.variants.length>1||p.variants.some(v=>v.title!=='Default Title');
 const optionLabel=optionNames.length===1?`${t("purchase-choose-prefix","Choose your")} ${optionNames[0].toLowerCase()}`:t("purchase-choose-option","Choose an option");
 return <div className="purchase" id="purchase">
  <div className="purchase-heading"><span className="eyebrow">{t("purchase-heading","MAKE IT YOUR RITUAL")}</span><strong>{money(variant?.price||p.price)}</strong></div>
  <SelectedRitual/>
  {hasOptions&&<fieldset><legend>{optionLabel}</legend><div className="variants">{p.variants.map(v=><button key={v.id} aria-pressed={id===v.id} disabled={!v.availableForSale||busy} className={id===v.id?'selected':''} onClick={()=>setId(v.id)}>{v.title}{!v.availableForSale?` · ${t("purchase-sold-out","Sold out")}`:''}</button>)}</div></fieldset>}
  <div className="purchase-actions"><div className="quantity"><button aria-label="Decrease quantity" disabled={q<=1} onClick={()=>setQ(q-1)}><Minus size={15}/></button><span aria-live="polite">{q}</span><button aria-label="Increase quantity" disabled={q>=99} onClick={()=>setQ(q+1)}><Plus size={15}/></button></div><button className="button" disabled={busy||!variant?.availableForSale} onClick={()=>variant&&void add(p,variant,q)}><ShoppingBag size={17}/>{busy?t("purchase-adding","Adding to your bag…"):variant?.availableForSale?t("purchase-add","Add to bag"):t("purchase-unavailable","Currently unavailable")}</button></div>
  {error&&<p className="error-message" role="alert">{error}</p>}{p.demo&&<p className="small muted">Illustrative product and price. This preview cannot be purchased.</p>}
  <p className="purchase-policy"><a href="/policies/shipping">{t("purchase-shipping","Shipping & returns")}</a> · <a href="/faq">{t("purchase-guidance","A little guidance")}</a></p>
 </div>;
}
