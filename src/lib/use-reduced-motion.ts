'use client';

import {useSyncExternalStore} from 'react';

const query='(prefers-reduced-motion: reduce)';
function subscribe(onChange:()=>void){
 const preference=window.matchMedia(query);
 preference.addEventListener('change',onChange);
 return()=>preference.removeEventListener('change',onChange);
}
const clientSnapshot=()=>window.matchMedia(query).matches;
// Server HTML and the first hydration render must use identical text/classes.
// Start with the static experience until the browser preference is available.
const serverSnapshot=()=>true;

export function useReducedMotionPreference(){
 return useSyncExternalStore(subscribe,clientSnapshot,serverSnapshot);
}
