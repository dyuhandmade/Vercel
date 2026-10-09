'use client';

import {useEffect} from 'react';
import {useSavedProducts} from './SavedProductsProvider';

export default function ProductViewTracker({handle}:{handle:string}){
 const {recordView}=useSavedProducts();
 useEffect(()=>{recordView(handle);},[handle,recordView]);
 return null;
}
