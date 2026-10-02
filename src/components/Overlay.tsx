'use client';
import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
export default function Overlay({open,close,title,children,className=''}:{open:boolean;close:()=>void;title:string;children:React.ReactNode;className?:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(!el)return;if(open){el.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=old;};}el.close();},[open]);
 return <dialog ref={ref} className={`overlay ${className}`} onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close();}} aria-label={title}><div className="overlay-inner"><div className="overlay-head"><h2>{title}</h2><button className="icon-button" aria-label={`Close ${title}`} onClick={close}><X/></button></div>{children}</div></dialog>;
}
