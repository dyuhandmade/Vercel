import {accountBody,accountFailure,accountJson,checkCustomerErrors,customerRequest,requireCustomer,type CustomerUserError} from '@/lib/customer-account';
import {AccountInputError,addressId,addressInput,pageCursor} from '@/lib/account-validation';
import {customerQueries} from '@/lib/customer-queries';
import type {AccountAddresses} from '@/lib/account-types';
export async function GET(request:Request){try{
 const session=await requireCustomer(),after=pageCursor(new URL(request.url).searchParams.get('after'));
 const data=await customerRequest<{customer:{addresses:AccountAddresses['addresses'];defaultAddress:{id:string}|null}}>(session,customerQueries.addresses,{after});
 return accountJson({addresses:data.customer.addresses,defaultAddressId:data.customer.defaultAddress?.id||null});
}catch(error){return accountFailure(error);}}
async function mutate(request:Request,action:'create'|'update'|'delete'){try{
 const session=await requireCustomer(request),body=await accountBody(request);
 if(body.default!==undefined&&typeof body.default!=='boolean')throw new AccountInputError('Please choose a valid default address setting.');
 const id=action==='create'?undefined:addressId(body.id);
 const address=action==='delete'||(action==='update'&&body.address===undefined)?undefined:addressInput(body.address);
 if(action==='update'&&!address&&body.default===undefined)throw new AccountInputError('Choose an address change.');
 const query=action==='create'?customerQueries.createAddress:action==='update'?customerQueries.updateAddress:customerQueries.deleteAddress;
 const key=action==='create'?'customerAddressCreate':action==='update'?'customerAddressUpdate':'customerAddressDelete';
 const data=await customerRequest<Record<string,{userErrors:CustomerUserError[]}>>(session,query,{id,address,default:body.default});
 checkCustomerErrors(data[key].userErrors);return accountJson({ok:true});
}catch(error){return accountFailure(error);}}
export const POST=(request:Request)=>mutate(request,'create');
export const PATCH=(request:Request)=>mutate(request,'update');
export const DELETE=(request:Request)=>mutate(request,'delete');
