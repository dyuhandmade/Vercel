'use client';

import {createContext,useContext,type ReactNode} from 'react';
import type {SiteContent} from '@/lib/content-safety';

const emptyContent:SiteContent={sections:{}};
const SiteContentContext=createContext<SiteContent>(emptyContent);

export function SiteContentProvider({content,children}:{content:SiteContent;children:ReactNode}){
 return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent():SiteContent{return useContext(SiteContentContext);}
