'use client';

import {Heart,LoaderCircle} from 'lucide-react';
import {useState} from 'react';
import {useSavedProducts} from './SavedProductsProvider';
import styles from './SavedProducts.module.css';
import {useAccountText} from './useAccountText';

export default function SavedProductButton({handle,title,compact=false,tabIndex}:{handle:string;title:string;compact?:boolean;tabIndex?:number}){
 const t=useAccountText();
 const {wishlist,ready,pending,toggle,error}=useSavedProducts();
 const [attempted,setAttempted]=useState(false);
 const saved=wishlist.includes(handle),busy=pending.includes(handle);
 const actionLabel=saved?t("wishlist-remove", "Remove from wishlist"):t("wishlist-save", "Save to wishlist");
 const accessibleLabel=`${saved?t('wishlist-remove-verb','Remove'):t('wishlist-save-verb','Save')} ${title} ${saved?t('wishlist-remove-destination','from wishlist'):t('wishlist-save-destination','to wishlist')}`;
 return <span className={compact?styles.cardSave:styles.inlineSave}>
  <button type="button" className={`${styles.saveButton}${compact?` ${styles.compact}`:''}`} tabIndex={tabIndex} aria-label={accessibleLabel} aria-pressed={saved} aria-busy={busy} disabled={!ready||busy} onClick={()=>{setAttempted(true);void toggle(handle);}} title={!ready&&error?t("wishlist-unavailable", "Wishlist unavailable. Open your account to retry."):actionLabel}>
   {busy?<LoaderCircle size={18} className={styles.spinner} aria-hidden="true"/>:<Heart size={18} strokeWidth={1.5} fill={saved?'currentColor':'none'} aria-hidden="true"/>}
   {!compact&&<span>{busy?t("saving", "Saving…"):saved?t("wishlist-saved", "Saved to wishlist"):t("wishlist-save", "Save to wishlist")}</span>}
  </button>
  {error&&(!compact||attempted)&&<span className={`${styles.error}${compact?` ${styles.cardError}`:''}`} role="alert">{error}</span>}
 </span>;
}
