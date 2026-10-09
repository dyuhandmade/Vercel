import {isIP} from 'node:net';
import {cookies} from 'next/headers';
import {shopify,isDemo} from '@/lib/shopify';
import {getCustomerSession} from '@/lib/customer-auth';
import {accountFailure,accountJson,CustomerAccountError} from '@/lib/customer-account';
import {isSameStorefrontOrigin} from '@/lib/account-security';
import {validCartId} from '@/lib/cart-validation';

export async function POST(request:Request){try{
 if(!isSameStorefrontOrigin(request))return accountJson({error:'Invalid request origin.'},403);
 if(isDemo())return accountJson({error:'Checkout will open when the shop is connected.'},409);
 const session=await getCustomerSession(),jar=await cookies(),id=jar.get('dyu-cart')?.value;
 if(!validCartId(id))return accountJson({error:'Your bag is empty or expired. Please add an item.'},400);
 const buyerIdentity=session?{customerAccessToken:session.accessToken}:{customerAccessToken:null,email:null,phone:null};
 // Configure only a header overwritten by the trusted deployment proxy.
 const ipHeader=process.env.SHOPIFY_BUYER_IP_HEADER;
 const candidate=ipHeader?request.headers.get(ipHeader)?.split(',')[0].trim():undefined;
 const buyerIp=candidate&&isIP(candidate)?candidate:undefined;
 const data=await shopify<{cartBuyerIdentityUpdate:{cart:{id:string;checkoutUrl:string;totalQuantity:number}|null;userErrors:{message:string}[]}}>(`mutation AccountCheckout($cartId:ID!,$buyerIdentity:CartBuyerIdentityInput!){cartBuyerIdentityUpdate(cartId:$cartId,buyerIdentity:$buyerIdentity){cart{id checkoutUrl totalQuantity} userErrors{message}}}`,{cartId:id,buyerIdentity},true,buyerIp);
 const result=data.cartBuyerIdentityUpdate;
 if(result.userErrors.length||!result.cart)throw new CustomerAccountError('We could not prepare your checkout. Please refresh your bag and try again.');
 if(!result.cart.totalQuantity)return accountJson({error:'Please add an item before checking out.'},400);
 const url=new URL(result.cart.checkoutUrl),store=process.env.SHOPIFY_STORE_DOMAIN;
 if(url.protocol!=='https:'||url.username||url.password||!(url.hostname===store||url.hostname==='shopify.com'||url.hostname.endsWith('.myshopify.com')||url.hostname.endsWith('.shopify.com')||url.hostname===process.env.SHOPIFY_CHECKOUT_DOMAIN))throw new Error('Invalid Shopify checkout URL');
 // Shopify checks the existing account-domain session as well as the cart identity.
 if(session)url.searchParams.set('sso','silent');
 return accountJson({checkoutUrl:url.toString()});
}catch(error){return accountFailure(error);}}
