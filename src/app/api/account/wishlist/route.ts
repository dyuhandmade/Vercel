import {accountBody,accountFailure,accountJson,checkCustomerErrors,customerRequest,requireCustomer,CustomerAccountError,type CustomerUserError} from '@/lib/customer-account';
import {combineWishlist,storedWishlist,wishlistInput} from '@/lib/account-validation';
import {customerQueries} from '@/lib/customer-queries';
import type {CustomerSession} from '@/lib/customer-auth';
type WishlistData={customer:{id:string;wishlist:{value:string;compareDigest:string}|null}};
async function read(session:CustomerSession){const data=await customerRequest<WishlistData>(session,customerQueries.wishlist);const saved=data.customer.wishlist;let handles:string[]=[];
 if(saved){try{handles=storedWishlist(JSON.parse(saved.value));}catch{throw new CustomerAccountError('Your wishlist could not be loaded. Please contact us for help.');}}
 return {id:data.customer.id,handles,compareDigest:saved?.compareDigest??null};
}
export async function GET(){try{const saved=await read(await requireCustomer());return accountJson({handles:saved.handles});}catch(error){return accountFailure(error);}}
export async function POST(request:Request){try{
 const session=await requireCustomer(request),input=wishlistInput(await accountBody(request));
 // Re-read and apply the action after a concurrent update, never overwrite a stale list.
 for(let attempt=0;attempt<3;attempt++){
  const current=await read(session),handles=combineWishlist(current.handles,input.handles,input.action);
  const data=await customerRequest<{metafieldsSet:{userErrors:CustomerUserError[]}}>(session,customerQueries.saveWishlist,{metafields:[{ownerId:current.id,namespace:'dyu',key:'wishlist',type:'list.single_line_text_field',value:JSON.stringify(handles),compareDigest:current.compareDigest}]});
  const errors=data.metafieldsSet.userErrors;
  if(errors.some(error=>['STALE_OBJECT','INVALID_COMPARE_DIGEST'].includes(error.code||'')))continue;
  checkCustomerErrors(errors);return accountJson({handles});
 }
 throw new CustomerAccountError('Your wishlist changed on another device. Please retry.',409);
}catch(error){return accountFailure(error);}}
