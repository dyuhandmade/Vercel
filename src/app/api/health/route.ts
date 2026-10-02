import {getProducts,isDemo} from '@/lib/shopify';

export async function GET(){const products=await getProducts().catch(()=>[]);return Response.json({application:'DYUhandmade',mode:isDemo()?'demo':'shopify',ready:products.length>0,productCount:products.length},{headers:{'Cache-Control':'no-store'}});}
