'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Heart,History,Trash2} from 'lucide-react';
import type {Product} from '@/lib/types';
import ProductCard from './ProductCard';
import {useSavedProducts} from './SavedProductsProvider';
import styles from './SavedProducts.module.css';
import {useAccountText} from './useAccountText';

export default function SavedProductsView({kind}:{kind:'wishlist'|'history'}){
 const t=useAccountText();
 const {wishlist,history,ready,authenticated,error,remove,clearHistory,refresh}=useSavedProducts();
 const handles=kind==='wishlist'?wishlist:history,key=handles.join(','),isHistory=kind==='history';
 const [products,setProducts]=useState<Product[]>([]),[loading,setLoading]=useState(true),[failure,setFailure]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setFailure('');
  if(!key){setProducts([]);setLoading(false);return()=>controller.abort();}
  setLoading(true);
  fetch(`/api/saved-products?handles=${encodeURIComponent(key)}`,{signal:controller.signal,cache:'no-store'})
   .then(async response=>{if(!response.ok)throw new Error('These products could not be loaded. Please try again.');const data=await response.json();return (Array.isArray(data)?data:data.products) as Product[];})
   .then(data=>{if(!controller.signal.aborted){setProducts(Array.isArray(data)?data:[]);setLoading(false);}})
   .catch(issue=>{if(!controller.signal.aborted){setFailure(issue instanceof Error?issue.message:'These products could not be loaded.');setLoading(false);}});
  return()=>controller.abort();
 },[key,retry]);
 const unavailable=handles.filter(handle=>!products.some(product=>product.handle===handle));
 return <section className={styles.savedView} aria-label={isHistory?t("history-region-label", "Recently viewed products"):t("wishlist-region-label", "Saved products")}>
  <div className={styles.topline}>
   <p>{isHistory?t("history-note", "Your last 24 viewed products are saved only in this browser. This history is separate from your orders and does not sync between devices."):authenticated?t("wishlist-signed-in-note", "Your wishlist is saved to your account, ready whenever you return."):t("wishlist-guest-note", "Your wishlist is saved in this browser. Sign in to keep it across your devices.")}</p>
   {isHistory&&handles.length>0&&<button type="button" className={styles.clear} onClick={clearHistory}><Trash2 size={15}/>{t("history-clear", "Clear history")}</button>}
  </div>
  {!isHistory&&error&&<p role="alert" className={styles.error}>{error} <button type="button" className="text-link" onClick={()=>void refresh()}>{ready?t("wishlist-refresh", "Refresh wishlist"):t("try-again", "Try again")}</button></p>}
  {failure&&<p role="alert" className={styles.error}>{failure} <button type="button" className="text-link" onClick={()=>setRetry(value=>value+1)}>{t("try-again", "Try again")}</button></p>}
  {(!isHistory&&!ready&&!error)||loading?<p role="status" className={styles.loading}>{isHistory?t("history-loading", "Finding your recently viewed rituals…"):t("wishlist-loading", "Finding your saved rituals…")}</p>:!failure&&handles.length===0?<div className={styles.empty}>
   {isHistory?<History size={30} strokeWidth={1}/>:<Heart size={30} strokeWidth={1}/>}
   <h2>{isHistory?t("history-empty-title", "Follow your curiosity."):t("wishlist-empty-title", "A little space for your favourites.")}</h2>
   <p>{isHistory?t("history-empty-body", "The products you explore will appear here, so you can find your way back."):t("wishlist-empty-body", "Tap the heart on a product to keep it here for another day.")}</p>
   <Link href="/shop" className="button">{t("explore-collection", "Explore the collection")}<ArrowUpRight size={16}/></Link>
  </div>:!failure&&<>
   <div className={styles.grid}>{handles.map(handle=>products.find(product=>product.handle===handle)).filter((product):product is Product=>!!product).map((product,index)=><ProductCard key={product.handle} product={product} index={index}/>)}</div>
   {unavailable.length>0&&<div className={styles.unavailable}><p>{unavailable.length} {unavailable.length===1?t("saved-one-unavailable", "product is no longer available in the collection."):t("saved-many-unavailable", "products are no longer available in the collection.")}</p>{!isHistory&&unavailable.map(handle=><button type="button" className="text-link" key={handle} onClick={()=>void remove(handle)}>{t("address-remove", "Remove")} {handle.replaceAll('-',' ')}</button>)}</div>}
  </>}
 </section>;
}
