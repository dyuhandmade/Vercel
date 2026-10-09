'use client';
import {useSiteContent} from './SiteContentProvider';
import {editableText} from '@/lib/content-safety';

import {createContext,useContext,useState,type ReactNode} from 'react';

const RitualSelection=createContext<{moment:string|null;selectMoment:(moment:string)=>void}>({moment:null,selectMoment:()=>{}});

export function RitualSelectionProvider({children}:{children:ReactNode}){
 const [moment,selectMoment]=useState<string|null>(null);
 return <RitualSelection.Provider value={{moment,selectMoment}}>{children}</RitualSelection.Provider>;
}

export const useRitualSelection=()=>useContext(RitualSelection);

export function SelectedRitual(){
 const siteContent=useSiteContent();
 const t=(key:string,fallback:string)=>editableText(siteContent,key,fallback);
 const {moment}=useRitualSelection();
 if(!moment)return null;
 const phrase=moment==='Morning'?t("purchase-moment-morning","For your mornings."):moment==='Evening'?t("purchase-moment-evening","For your evenings."):t("purchase-moment-pause","For a quiet pause.");
 return <div className="selected-ritual" aria-live="polite"><div><span>{t("purchase-moment-heading","YOUR CHOSEN MOMENT")}</span><p>{phrase}</p></div><a href="#ritual">{t("purchase-moment-change","Change moment")} <span aria-hidden="true">↗</span></a></div>;
}
