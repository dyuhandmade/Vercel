export const GUEST_WISHLIST_KEY='dyu:wishlist:guest:v1';
export const RECENT_PRODUCTS_KEY='dyu:recent-products:v1';
export const WISHLIST_LIMIT=100;
export const RECENT_PRODUCTS_LIMIT=24;

/** Only public catalogue handles belong in browser storage. */
export function productHandles(value:unknown,limit=WISHLIST_LIMIT):string[]{
 if(!Array.isArray(value))return [];
 return [...new Set(value.filter((handle):handle is string=>typeof handle==='string'&&/^[a-z0-9][a-z0-9-]{0,127}$/.test(handle)))].slice(0,limit);
}

export function readProductHandles(key:string,limit=WISHLIST_LIMIT):string[]{
 try{return productHandles(JSON.parse(localStorage.getItem(key)||'[]'),limit);}catch{return [];}
}

export function writeProductHandles(key:string,handles:string[],limit=WISHLIST_LIMIT):boolean{
 try{localStorage.setItem(key,JSON.stringify(productHandles(handles,limit)));return true;}catch{return false;}
}

export function recordProductView(handles:string[],handle:string):string[]{
 return productHandles([handle,...handles.filter(item=>item!==handle)],RECENT_PRODUCTS_LIMIT);
}
