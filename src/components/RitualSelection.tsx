'use client';

import {createContext,useContext,useState,type ReactNode} from 'react';

const RitualSelection=createContext<{moment:string|null;selectMoment:(moment:string)=>void}>({moment:null,selectMoment:()=>{}});

export function RitualSelectionProvider({children}:{children:ReactNode}){
 const [moment,selectMoment]=useState<string|null>(null);
 return <RitualSelection.Provider value={{moment,selectMoment}}>{children}</RitualSelection.Provider>;
}

export const useRitualSelection=()=>useContext(RitualSelection);

export function SelectedRitual(){
 const {moment}=useRitualSelection();
 if(!moment)return null;
 const phrase=moment==='Morning'?'For your mornings.':moment==='Evening'?'For your evenings.':'For a quiet pause.';
 return <div className="selected-ritual" aria-live="polite"><div><span>YOUR CHOSEN MOMENT</span><p>{phrase}</p></div><a href="#ritual">Change moment <span aria-hidden="true">↗</span></a></div>;
}
