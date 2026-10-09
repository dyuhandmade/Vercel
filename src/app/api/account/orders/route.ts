import {accountFailure,accountJson,customerRequest,requireCustomer,safeCustomerUrl} from '@/lib/customer-account';
import {pageCursor} from '@/lib/account-validation';
import {customerQueries} from '@/lib/customer-queries';
import type {AccountOrders} from '@/lib/account-types';
export async function GET(request:Request){try{
 const session=await requireCustomer(),after=pageCursor(new URL(request.url).searchParams.get('after'));
 const data=await customerRequest<{customer:AccountOrders}>(session,customerQueries.orders,{after});
 return accountJson({orders:{...data.customer.orders,nodes:data.customer.orders.nodes.map(order=>({...order,statusPageUrl:safeCustomerUrl(order.statusPageUrl)}))}});
}catch(error){return accountFailure(error);}}
