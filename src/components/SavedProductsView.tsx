'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Heart,History,Trash2} from 'lucide-react';
import type {Product} from '@/lib/types';
import ProductCard from './ProductCard';
import {useSavedProducts} from './SavedProductsProvider';
import styles from './SavedProducts.module.css';

export default function SavedProductsView({kind}:{kind:'wishlist'|'history'}){
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
 return <section className={styles.savedView} aria-label={isHistory?'Recently viewed products':'Saved products'}>
  <div className={styles.topline}>
   <p>{isHistory?'Your last 24 viewed products are saved only in this browser. This history is separate from your orders and does not sync between devices.':authenticated?'Your wishlist is saved to your account, ready whenever you return.':'Your wishlist is saved in this browser. Sign in to keep it across your devices.'}</p>
   {isHistory&&handles.length>0&&<button type="button" className={styles.clear} onClick={clearHistory}><Trash2 size={15}/>Clear history</button>}
  </div>
  {!isHistory&&error&&<p role="alert" className={styles.error}>{error} <button type="button" className="text-link" onClick={()=>void refresh()}>{ready?'Refresh wishlist':'Try again'}</button></p>}
  {failure&&<p role="alert" className={styles.error}>{failure} <button type="button" className="text-link" onClick={()=>setRetry(value=>value+1)}>Try again</button></p>}
  {(!isHistory&&!ready&&!error)||loading?<p role="status" className={styles.loading}>Finding your {isHistory?'recently viewed':'saved'} rituals…</p>:!failure&&handles.length===0?<div className={styles.empty}>
   {isHistory?<History size={30} strokeWidth={1}/>:<Heart size={30} strokeWidth={1}/>}
   <h2>{isHistory?'Follow your curiosity.':'A little space for your favourites.'}</h2>
   <p>{isHistory?'The products you explore will appear here, so you can find your way back.':'Tap the heart on a product to keep it here for another day.'}</p>
   <Link href="/shop" className="button">Explore the collection<ArrowUpRight size={16}/></Link>
  </div>:!failure&&<>
   <div className={styles.grid}>{handles.map(handle=>products.find(product=>product.handle===handle)).filter((product):product is Product=>!!product).map((product,index)=><ProductCard key={product.handle} product={product} index={index}/>)}</div>
   {unavailable.length>0&&<div className={styles.unavailable}><p>{unavailable.length} {unavailable.length===1?'product is':'products are'} no longer available in the collection.</p>{!isHistory&&unavailable.map(handle=><button type="button" className="text-link" key={handle} onClick={()=>void remove(handle)}>Remove {handle.replaceAll('-',' ')}</button>)}</div>}
  </>}
 </section>;
}
