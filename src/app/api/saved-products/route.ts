import {NextResponse} from 'next/server';
import {getProducts} from '@/lib/shopify';
import {productHandles} from '@/lib/saved-products';
export async function GET(request:Request){
 const raw=new URL(request.url).searchParams.get('handles')||'';
 if(raw.length>13000||raw.split(',').length>100)return NextResponse.json({error:'Too many saved items.'},{status:400});
 const handles=productHandles(raw.split(','));
 if(!handles.length)return NextResponse.json({products:[]},{headers:{'Cache-Control':'private, no-store'}});
 try{const products=await getProducts();const byHandle=new Map(products.map(product=>[product.handle,product]));return NextResponse.json({products:handles.map(handle=>byHandle.get(handle)).filter(Boolean)},{headers:{'Cache-Control':'private, no-store'}});}
 catch{return NextResponse.json({error:'Saved products could not be loaded. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
