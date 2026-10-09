import {accountFailure,accountJson,customerRequest,requireCustomer,safeCustomerUrl} from '@/lib/customer-account';
import {orderId,pageCursor} from '@/lib/account-validation';
import {customerQueries} from '@/lib/customer-queries';
import type {AccountOrderDetail} from '@/lib/account-types';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const session=await requireCustomer(),id=orderId((await params).id),after=pageCursor(new URL(request.url).searchParams.get('after'));
 const data=await customerRequest<{order:AccountOrderDetail|null}>(session,customerQueries.order,{id,after});
 if(!data.order)return accountJson({error:'This order could not be found in your account.'},404);
 data.order.statusPageUrl=safeCustomerUrl(data.order.statusPageUrl);
 data.order.fulfillments.nodes=data.order.fulfillments.nodes.map(fulfillment=>({...fulfillment,trackingInformation:fulfillment.trackingInformation.map(tracking=>({...tracking,url:safeCustomerUrl(tracking.url)||null}))}));
 return accountJson(data);
}catch(error){return accountFailure(error);}}
