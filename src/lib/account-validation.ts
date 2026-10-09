import type {AccountAddressInput} from './account-types';

export class AccountInputError extends Error{}
const clean=(value:unknown,max:number)=>{if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f]/.test(value))throw new AccountInputError('Please check the information you entered.');return value.trim();};
export function profileInput(body:unknown){
 if(!body||typeof body!=='object')throw new AccountInputError('Please enter your name.');
 const b=body as Record<string,unknown>;
 if(Object.keys(b).some(key=>!['firstName','lastName'].includes(key)))throw new AccountInputError('Only your name can be updated here.');
 const firstName=clean(b.firstName,100),lastName=clean(b.lastName,100);
 if(!firstName)throw new AccountInputError('Please enter your first name.');
 return {firstName,lastName};
}
export function addressInput(body:unknown):AccountAddressInput{
 if(!body||typeof body!=='object'||Array.isArray(body))throw new AccountInputError('Please enter your address.');
 const allowed=['firstName','lastName','company','address1','address2','city','zoneCode','territoryCode','zip','phoneNumber'];
 const source=body as Record<string,unknown>,result:Record<string,string>={};
 for(const [key,value]of Object.entries(source)){if(!allowed.includes(key))throw new AccountInputError('Please check the address fields.');result[key]=clean(value,key==='phoneNumber'?40:200);}
 for(const key of ['firstName','address1','city','territoryCode'])if(!result[key])throw new AccountInputError('Please enter your name, street, city, and country.');
 result.territoryCode=result.territoryCode.toUpperCase();
 if(!/^[A-Z]{2}$/.test(result.territoryCode))throw new AccountInputError('Choose a valid country code.');
 return result;
}
export function addressId(value:unknown){if(typeof value!=='string'||value.length>500||!/^gid:\/\/shopify\/CustomerAddress\/[A-Za-z0-9_=?&%-]+$/.test(value))throw new AccountInputError('Please choose a saved address.');return value;}
export function orderId(value:unknown){if(typeof value!=='string'||value.length>160||!/^gid:\/\/shopify\/Order\/\d+$/.test(value))throw new AccountInputError('This order could not be found.');return value;}
export function pageCursor(value:string|null){if(value&& (value.length>1024||/[\u0000-\u001f]/.test(value)))throw new AccountInputError('Please reload this page.');return value||null;}
export function wishlistInput(body:unknown){
 if(!body||typeof body!=='object')throw new AccountInputError('Choose an item to save.');
 const {action,handles}=body as {action:unknown;handles:unknown};
 if(!['add','remove','merge'].includes(String(action))||!Array.isArray(handles)||!handles.length||handles.length>100||handles.some(h=>typeof h!=='string'||!/^[a-z0-9][a-z0-9-]{0,127}$/.test(h)))throw new AccountInputError('Please choose valid products for your wishlist.');
 return {action:action as 'add'|'remove'|'merge',handles:[...new Set(handles as string[])]};
}
export function combineWishlist(current:string[],incoming:string[],action:'add'|'remove'|'merge'){
 const handles=action==='remove'?current.filter(handle=>!incoming.includes(handle)):[...new Set([...current,...incoming])];
 if(handles.length>100)throw new AccountInputError('Your wishlist holds up to 100 items. Remove an item before saving another.');
 return handles;
}

/** Refuse malformed stored data so a later write cannot silently discard saved items. */
export function storedWishlist(value: unknown): string[] {
 if(!Array.isArray(value)||value.length>100||value.some(handle=>typeof handle!=='string'||!/^[a-z0-9][a-z0-9-]{0,127}$/.test(handle)))throw new AccountInputError('Your saved wishlist needs attention. Please contact us for help.');
 return [...new Set(value as string[])];
}
