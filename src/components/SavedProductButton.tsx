'use client';

import {Heart,LoaderCircle} from 'lucide-react';
import {useState} from 'react';
import {useSavedProducts} from './SavedProductsProvider';
import styles from './SavedProducts.module.css';

export default function SavedProductButton({handle,title,compact=false,tabIndex}:{handle:string;title:string;compact?:boolean;tabIndex?:number}){
 const {wishlist,ready,pending,toggle,error}=useSavedProducts();
 const [attempted,setAttempted]=useState(false);
 const saved=wishlist.includes(handle),busy=pending.includes(handle);
 return <span className={compact?styles.cardSave:styles.inlineSave}>
  <button type="button" className={`${styles.saveButton}${compact?` ${styles.compact}`:''}`} tabIndex={tabIndex} aria-label={`${saved?'Remove':'Save'} ${title} ${saved?'from':'to'} wishlist`} aria-pressed={saved} aria-busy={busy} disabled={!ready||busy} onClick={()=>{setAttempted(true);void toggle(handle);}} title={!ready&&error?'Wishlist unavailable. Open your account to retry.':saved?'Remove from wishlist':'Save to wishlist'}>
   {busy?<LoaderCircle size={18} className={styles.spinner} aria-hidden="true"/>:<Heart size={18} strokeWidth={1.5} fill={saved?'currentColor':'none'} aria-hidden="true"/>}
   {!compact&&<span>{busy?'Saving…':saved?'Saved to wishlist':'Save to wishlist'}</span>}
  </button>
  {error&&(!compact||attempted)&&<span className={`${styles.error}${compact?` ${styles.cardError}`:''}`} role="alert">{error}</span>}
 </span>;
}
