'use client';
import {createContext,useContext,useEffect,useState,useCallback} from 'react';
import type {Cart,Product,Variant} from '@/lib/types';
type Store={cart:Cart|null;busy:boolean;error:string;add:(p:Product,v:Variant,q:number)=>Promise<void>;update:(id:string,q:number)=>Promise<void>;refresh:()=>Promise<void>;bagOpen:boolean;setBagOpen:(v:boolean)=>void;demo:boolean;clearError:()=>void};
const Context=createContext<Store|null>(null);
const empty=():Cart=>({id:'preview',checkoutUrl:'',totalQuantity:0,lines:{nodes:[]},cost:{subtotalAmount:{amount:'0',currencyCode:'INR'},totalAmount:{amount:'0',currencyCode:'INR'}}});
function totals(c:Cart){const total=c.lines.nodes.reduce((s,l)=>s+Number(l.merchandise.price.amount)*l.quantity,0);c.totalQuantity=c.lines.nodes.reduce((s,l)=>s+l.quantity,0);c.cost={subtotalAmount:{amount:String(total),currencyCode:c.lines.nodes[0]?.merchandise.price.currencyCode||'INR'},totalAmount:{amount:String(total),currencyCode:c.lines.nodes[0]?.merchandise.price.currencyCode||'INR'}};return c;}
export function StoreProvider({children,demo}:{children:React.ReactNode;demo:boolean}){
 const [cart,setCart]=useState<Cart|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[bagOpen,setBagOpen]=useState(false);
 const save=useCallback((c:Cart)=>{setCart(c);if(demo)try{localStorage.setItem('dyu-preview-bag',JSON.stringify(c));}catch{}},[demo]);
 const refresh=useCallback(async()=>{try{if(demo){const raw=localStorage.getItem('dyu-preview-bag');if(raw){const c=JSON.parse(raw);if(c.id==='preview'&&Array.isArray(c.lines?.nodes))setCart(totals(c));}return;}const r=await fetch('/api/cart');const d=await r.json();if(!r.ok)throw new Error(d.error);setCart(d.cart);}catch{setError('We could not load your bag. Please try again.');}},[demo]);
 useEffect(()=>{void refresh();},[refresh]);
 const mutate=async(action:string,lines:unknown[])=>{const r=await fetch('/api/cart',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,lines})});const d=await r.json();if(!r.ok)throw new Error(d.error);save(d.cart);};
 const add=async(p:Product,v:Variant,q:number)=>{if(busy)return;setBusy(true);setError('');try{if(demo){const c=structuredClone(cart||empty());const line=c.lines.nodes.find(l=>l.merchandise.id===v.id);if(line)line.quantity=Math.min(99,line.quantity+q);else c.lines.nodes.push({id:v.id,quantity:q,merchandise:{id:v.id,title:v.title,price:v.price,product:{title:p.title,handle:p.handle,featuredImage:p.image?{url:p.image}:undefined}}});save(totals(c));}else await mutate('add',[{merchandiseId:v.id,quantity:q}]);setBagOpen(true);}catch(e){setError(e instanceof Error?e.message:'Could not add this item.');}finally{setBusy(false);}};
 const update=async(id:string,q:number)=>{if(busy)return;setBusy(true);setError('');try{if(demo&&cart){const c=structuredClone(cart);c.lines.nodes=q===0?c.lines.nodes.filter(l=>l.id!==id):c.lines.nodes.map(l=>l.id===id?{...l,quantity:Math.min(99,q)}:l);save(totals(c));}else await mutate(q===0?'remove':'update',q===0?[id]:[{id,quantity:q}]);}catch(e){setError(e instanceof Error?e.message:'Could not update your bag.');}finally{setBusy(false);}};
 return <Context.Provider value={{cart,busy,error,add,update,refresh,bagOpen,setBagOpen,demo,clearError:()=>setError('')}}>{children}</Context.Provider>;
}
export const useStore=()=>{const c=useContext(Context);if(!c)throw new Error('StoreProvider required');return c;};
