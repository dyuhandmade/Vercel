'use client';
import {useSiteContent} from './SiteContentProvider';
import {editableText} from '@/lib/content-safety';
import Link from 'next/link';
import Image from 'next/image';
import {Minus,Plus,ShoppingBag,Trash2} from 'lucide-react';
import {useStore} from './StoreProvider';
import {money} from '@/lib/types';
import {demoProducts} from '@/lib/demo';
import styles from './Bag.module.css';

export default function Bag(){
 const siteContent=useSiteContent();
 const t=(key:string,fallback:string)=>editableText(siteContent,key,fallback);
 const {cart,busy,error,update,checkout,demo,setBagOpen,refresh}=useStore();
 return <div className="bag-content">
  {demo&&<p className="notice">Preview bag · Sample products and prices. Checkout will open when the shop is connected.</p>}
  {error&&<div role="alert" className="error-message">{error} <button onClick={()=>void refresh()}>{t("bag-retry","Retry")}</button></div>}
  {!cart?.lines.nodes.length?<div className="empty-state"><ShoppingBag size={36} strokeWidth={1}/><h3>{t("bag-empty-title","A little space for your rituals.")}</h3><p>{t("bag-empty-body","Your bag is waiting to be filled.")}</p><Link href="/shop" className="button" onClick={()=>setBagOpen(false)}>{t("bag-empty-action","Explore the collection")}</Link></div>:<>
   <div className="bag-lines">{cart.lines.nodes.map(line=>{
    const product=line.merchandise.product;
    const preview=demo?demoProducts.find(item=>item.handle===product.handle):undefined;
    const image=product.featuredImage?.url||(preview?`/images/${preview.shape==='general'?'jar':preview.shape}-atelier.png`:undefined);
    const href=`/products/${product.handle}`;
    return <div className={`bag-line ${styles.line}`} key={line.id}>
     <Link href={href} className={styles.imageLink} onClick={()=>setBagOpen(false)} aria-label={`View ${product.title}`}>
      {image?<Image src={image} alt={`${product.title} product image`} fill sizes="(max-width: 540px) 76px, 96px" className={styles.image}/>:<ShoppingBag size={25} strokeWidth={1.1} aria-hidden="true"/>}
     </Link>
     <div className={styles.details}>
      <Link href={href} onClick={()=>setBagOpen(false)}>{product.title}</Link>
      {line.merchandise.title!=='Default Title'&&<p>{line.merchandise.title}</p>}
      <div className="quantity"><button aria-label={`Decrease ${product.title}`} disabled={busy} onClick={()=>void update(line.id,line.quantity-1)}><Minus size={14}/></button><span>{line.quantity}</span><button aria-label={`Increase ${product.title}`} disabled={busy||line.quantity>=99} onClick={()=>void update(line.id,line.quantity+1)}><Plus size={14}/></button></div>
     </div>
     <div className={`line-end ${styles.lineEnd}`}><span>{money({amount:String(Number(line.merchandise.price.amount)*line.quantity),currencyCode:line.merchandise.price.currencyCode})}</span><button className="icon-button" disabled={busy} aria-label={`Remove ${product.title}`} onClick={()=>void update(line.id,0)}><Trash2 size={16}/></button></div>
    </div>;
   })}</div>
   <div className="bag-total"><span>{t("bag-subtotal","Subtotal")}</span><strong>{money(cart.cost.subtotalAmount)}</strong></div>
   <p className="small muted">{t("bag-checkout-note","Shipping and taxes are calculated at checkout.")}</p>
   {demo?<button className="button full" disabled>Checkout available at launch</button>:<button className="button full" disabled={busy} onClick={()=>void checkout()}>{busy?t("bag-checkout-busy","Preparing your bag…"):t("bag-checkout-action","Continue to checkout")}</button>}
   <Link href="/shop" className="text-link continue" onClick={()=>setBagOpen(false)}>{t("bag-continue-action","Continue exploring")}</Link>
  </>}
 </div>;
}
