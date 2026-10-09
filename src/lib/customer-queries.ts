const customerFields=`id firstName lastName displayName emailAddress{emailAddress} phoneNumber{phoneNumber}`;
const addressFields=`id firstName lastName company address1 address2 city zoneCode province territoryCode country zip phoneNumber formatted`;
const orderFields=`id name processedAt financialStatus fulfillmentStatus totalPrice{amount currencyCode} statusPageUrl cancelledAt`;

export const customerQueries={
 profile:`query AccountProfile{customer{${customerFields}}}`,
 updateProfile:`mutation AccountProfileUpdate($input:CustomerUpdateInput!){customerUpdate(input:$input){customer{${customerFields}} userErrors{field message}}}`,
 orders:`query AccountOrders($after:String){customer{orders(first:12,after:$after,sortKey:PROCESSED_AT,reverse:true){nodes{${orderFields}} pageInfo{hasNextPage endCursor}}}}`,
 order:`query AccountOrder($id:ID!,$after:String){order(id:$id){${orderFields} subtotal{amount currencyCode} totalShipping{amount currencyCode} totalTax{amount currencyCode} totalRefunded{amount currencyCode} shippingAddress{${addressFields}} lineItems(first:50,after:$after){nodes{id name variantTitle quantity image{url altText} price{amount currencyCode} totalPrice{amount currencyCode} productId variantId} pageInfo{hasNextPage endCursor}} fulfillments(first:20){nodes{id status estimatedDeliveryAt trackingInformation{company number url}} pageInfo{hasNextPage endCursor}}}}`,
 addresses:`query AccountAddresses($after:String){customer{defaultAddress{id} addresses(first:20,after:$after){nodes{${addressFields}} pageInfo{hasNextPage endCursor}}}}`,
 createAddress:`mutation AccountAddressCreate($address:CustomerAddressInput!,$default:Boolean){customerAddressCreate(address:$address,defaultAddress:$default){customerAddress{id} userErrors{field message}}}`,
 updateAddress:`mutation AccountAddressUpdate($id:ID!,$address:CustomerAddressInput,$default:Boolean){customerAddressUpdate(addressId:$id,address:$address,defaultAddress:$default){customerAddress{id} userErrors{field message}}}`,
 deleteAddress:`mutation AccountAddressDelete($id:ID!){customerAddressDelete(addressId:$id){deletedAddressId userErrors{field message}}}`,
 wishlist:`query AccountWishlist{customer{id wishlist:metafield(namespace:"dyu",key:"wishlist"){value compareDigest}}}`,
 saveWishlist:`mutation AccountWishlistSave($metafields:[MetafieldsSetInput!]!){metafieldsSet(metafields:$metafields){metafields{key value} userErrors{code field message}}}`,
};
