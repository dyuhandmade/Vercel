import type {Money} from './types';

export type AccountCustomer={id:string;firstName:string|null;lastName:string|null;displayName:string;email:string|null;phone:string|null};
export type AccountState={configured:boolean;authenticated:boolean;customer?:AccountCustomer;accountUrl?:string;error?:string};
export type AccountPageInfo={hasNextPage:boolean;endCursor:string|null};
export type AccountAddress={id:string;firstName:string|null;lastName:string|null;company:string|null;address1:string|null;address2:string|null;city:string|null;zoneCode:string|null;province:string|null;territoryCode:string|null;country:string|null;zip:string|null;phoneNumber:string|null;formatted:string[]};
export type AccountAddressInput=Partial<Pick<AccountAddress,'firstName'|'lastName'|'company'|'address1'|'address2'|'city'|'zoneCode'|'territoryCode'|'zip'|'phoneNumber'>>;
export type AccountAddresses={addresses:{nodes:AccountAddress[];pageInfo:AccountPageInfo};defaultAddressId:string|null};
export type AccountOrder={id:string;name:string;processedAt:string;financialStatus:string|null;fulfillmentStatus:string;totalPrice:Money;statusPageUrl:string;cancelledAt:string|null};
export type AccountOrders={orders:{nodes:AccountOrder[];pageInfo:AccountPageInfo}};
export type AccountOrderLine={id:string;name:string;variantTitle:string|null;quantity:number;image:{url:string;altText:string|null}|null;price:Money|null;totalPrice:Money|null;productId:string|null;variantId:string|null};
export type AccountOrderDetail=AccountOrder&{subtotal:Money|null;totalShipping:Money;totalTax:Money|null;totalRefunded:Money;shippingAddress:AccountAddress|null;lineItems:{nodes:AccountOrderLine[];pageInfo:AccountPageInfo};fulfillments:{nodes:{id:string;status:string|null;estimatedDeliveryAt:string|null;trackingInformation:{company:string|null;number:string|null;url:string|null}[]}[];pageInfo:AccountPageInfo}};
