'use client';

import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {GUEST_WISHLIST_KEY,RECENT_PRODUCTS_KEY,RECENT_PRODUCTS_LIMIT,WISHLIST_LIMIT,productHandles,readProductHandles,recordProductView,writeProductHandles} from '@/lib/saved-products';

type SavedProductsState={
 wishlist:string[];history:string[];ready:boolean;authenticated:boolean;pending:string[];error:string;
 toggle:(handle:string)=>Promise<void>;remove:(handle:string)=>Promise<void>;recordView:(handle:string)=>void;
 clearHistory:()=>void;refresh:()=>Promise<void>;
};
const SavedProductsContext=createContext<SavedProductsState|null>(null);
class WishlistError extends Error{constructor(message:string,readonly status:number){super(message);}}

async function wishlistRequest(action?:'add'|'remove'|'merge',handles?:string[]){
 const response=await fetch('/api/account/wishlist',{
  method:action?'POST':'GET',cache:'no-store',credentials:'same-origin',
  ...(action?{headers:{'Content-Type':'application/json'},body:JSON.stringify({action,handles})}:{}),
 });
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new WishlistError(response.status===401?'Your session has ended. Sign in again to update your wishlist.':typeof result.error==='string'?result.error:'Your wishlist could not be updated. Please try again.',response.status);
 return productHandles(result.handles);
}

export function SavedProductsProvider({children}:{children:React.ReactNode}){
 const path=usePathname();
 const [guest,setGuest]=useState<string[]>([]),[saved,setSaved]=useState<string[]>([]),[history,setHistory]=useState<string[]>([]);
 const [customerId,setCustomerId]=useState<string|null>(null),[ready,setReady]=useState(false),[pending,setPending]=useState<string[]>([]),[error,setError]=useState('');
 const identity=useRef<string|null|undefined>(undefined),identityVersion=useRef(0),requestVersion=useRef(0),mutationVersion=useRef(0),pendingRef=useRef(new Set<string>());
 const queue=useRef<Promise<void>>(Promise.resolve());
 const guestRef=useRef(guest),savedRef=useRef(saved);guestRef.current=guest;savedRef.current=saved;

 const refresh=useCallback(async()=>{
  const version=++requestVersion.current;setReady(false);
  try{
   let mergeError='';
   const response=await fetch('/api/account',{cache:'no-store',credentials:'same-origin'});
   if(!response.ok)throw new Error('Account status could not be checked. Please try again.');
   const account=await response.json();
   if(version!==requestVersion.current)return;
   const nextId=account.authenticated&&typeof account.customer?.id==='string'?account.customer.id:null;
   if(identity.current!==nextId){
    identity.current=nextId;identityVersion.current++;setCustomerId(nextId);setSaved([]);savedRef.current=[];setReady(false);
    pendingRef.current.clear();setPending([]);
   }
   const guestHandles=readProductHandles(GUEST_WISHLIST_KEY);guestRef.current=guestHandles;setGuest(guestHandles);
   if(nextId){
    await queue.current;
    if(version!==requestVersion.current||identity.current!==nextId)return;
    const mutation=mutationVersion.current;
    let handles=await wishlistRequest();
    if(version!==requestVersion.current||identity.current!==nextId)return;
    if(guestHandles.length){
     try{
      handles=await wishlistRequest('merge',guestHandles);
      if(version!==requestVersion.current||identity.current!==nextId)return;
      // Remove only the merged items, preserving additions from another tab.
      const remaining=readProductHandles(GUEST_WISHLIST_KEY).filter(handle=>!guestHandles.includes(handle));
      writeProductHandles(GUEST_WISHLIST_KEY,remaining);guestRef.current=remaining;setGuest(remaining);
     }catch(issue){
      if(issue instanceof WishlistError&&issue.status===401)throw issue;
      mergeError=`Your account wishlist is available, but your browser favourites have not been added yet. ${issue instanceof Error?issue.message:'Please try again.'} Refresh your wishlist to retry.`;
     }
    }
    if(version===requestVersion.current&&identity.current===nextId&&mutation===mutationVersion.current){savedRef.current=handles;setSaved(handles);}
   }
   if(version===requestVersion.current){setReady(true);setError(mergeError);}
  }catch(issue){
   if(version===requestVersion.current){setError(issue instanceof Error?issue.message:'Your wishlist is temporarily unavailable.');setReady(false);}
  }
 },[]);

 useEffect(()=>{
  setGuest(readProductHandles(GUEST_WISHLIST_KEY));setHistory(readProductHandles(RECENT_PRODUCTS_KEY,RECENT_PRODUCTS_LIMIT));
  const clearAccount=()=>{
   requestVersion.current++;identityVersion.current++;identity.current=null;setCustomerId(null);savedRef.current=[];setSaved([]);
   pendingRef.current.clear();setPending([]);setError('');setReady(true);
  };
  const sync=(event:StorageEvent)=>{
   if(event.key===GUEST_WISHLIST_KEY){const handles=readProductHandles(GUEST_WISHLIST_KEY);guestRef.current=handles;setGuest(handles);}
   if(event.key===RECENT_PRODUCTS_KEY)setHistory(readProductHandles(RECENT_PRODUCTS_KEY,RECENT_PRODUCTS_LIMIT));
   if(event.key==='dyu:account-event'){
    let loggedOut=false;try{loggedOut=JSON.parse(event.newValue||'null')?.type==='logout';}catch{}
    if(loggedOut)clearAccount();else void refresh();
   }
  };
  const check=()=>void refresh();
  const accountChanged=(event:Event)=>{if((event as CustomEvent<{type?:string}>).detail?.type==='logout')clearAccount();else check();};
  window.addEventListener('storage',sync);window.addEventListener('focus',check);window.addEventListener('dyu:account-changed',accountChanged);
  return()=>{requestVersion.current++;window.removeEventListener('storage',sync);window.removeEventListener('focus',check);window.removeEventListener('dyu:account-changed',accountChanged);};
 },[refresh]);
 useEffect(()=>{void refresh();},[path,refresh]);

 const update=useCallback(async(handle:string,forceRemove=false)=>{
  if(!ready||!productHandles([handle]).length||pendingRef.current.has(handle))return;
  const id=identity.current,session=identityVersion.current,list=id?savedRef.current:guestRef.current;
  const action=forceRemove||list.includes(handle)?'remove':'add';
  if(action==='add'&&list.length>=WISHLIST_LIMIT){setError(`Your wishlist can hold up to ${WISHLIST_LIMIT} items. Remove an item to save another.`);return;}
  setError('');
  if(!id){
   const next=action==='remove'?list.filter(item=>item!==handle):productHandles([handle,...list]);
   guestRef.current=next;setGuest(next);
   if(!writeProductHandles(GUEST_WISHLIST_KEY,next))setError('Saved for this visit. Your browser is preventing wishlist storage.');
   return;
  }
  mutationVersion.current++;pendingRef.current.add(handle);setPending([...pendingRef.current]);
  const operation=async()=>{
   if(identity.current!==id||identityVersion.current!==session)return;
   try{
    const next=await wishlistRequest(action,[handle]);
    if(identity.current===id&&identityVersion.current===session){savedRef.current=next;setSaved(next);}
   }catch(issue){if(identity.current===id&&identityVersion.current===session){
    setError(issue instanceof Error?issue.message:'Your wishlist could not be updated.');
    if(issue instanceof WishlistError&&issue.status===401){savedRef.current=[];setSaved([]);setReady(false);void refresh();}
   }}
   finally{if(identity.current===id&&identityVersion.current===session){pendingRef.current.delete(handle);setPending([...pendingRef.current]);}}
  };
  queue.current=queue.current.then(operation,operation);await queue.current;
 },[ready,refresh]);
 const toggle=useCallback((handle:string)=>update(handle),[update]);
 const remove=useCallback((handle:string)=>update(handle,true),[update]);
 const recordView=useCallback((handle:string)=>{
  if(!productHandles([handle]).length)return;
  setHistory(previous=>{const next=recordProductView(previous.length?previous:readProductHandles(RECENT_PRODUCTS_KEY,RECENT_PRODUCTS_LIMIT),handle);writeProductHandles(RECENT_PRODUCTS_KEY,next,RECENT_PRODUCTS_LIMIT);return next;});
 },[]);
 const clearHistory=useCallback(()=>{setHistory([]);writeProductHandles(RECENT_PRODUCTS_KEY,[],RECENT_PRODUCTS_LIMIT);},[]);

 return <SavedProductsContext.Provider value={{wishlist:customerId?(ready?saved:[]):guest,history,ready,authenticated:!!customerId,pending,error,toggle,remove,recordView,clearHistory,refresh}}>{children}</SavedProductsContext.Provider>;
}

export function useSavedProducts(){
 const context=useContext(SavedProductsContext);
 if(!context)throw new Error('Saved products must be inside SavedProductsProvider.');
 return context;
}
