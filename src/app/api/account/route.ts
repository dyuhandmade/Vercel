import {getAccountConfig,getCustomerSession} from '@/lib/customer-auth';
import {accountFailure,accountJson,customerProfile,safeCustomerUrl} from '@/lib/customer-account';
export async function GET(){
 try{
  const config=getAccountConfig(),shopId=process.env.SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID;
  const accountUrl=safeCustomerUrl(process.env.SHOPIFY_CUSTOMER_ACCOUNT_URL||(shopId&&/^\d+$/.test(shopId)?`https://shopify.com/${shopId}/account`:''));
  if(!config)return accountJson({configured:false,authenticated:false,accountUrl});
  const session=await getCustomerSession();
  return accountJson({configured:true,authenticated:!!session,accountUrl,...(session?{customer:await customerProfile(session)}:{})});
 }catch(error){return accountFailure(error);}
}
