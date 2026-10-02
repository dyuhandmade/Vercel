import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {isDemo,getCart,mutateCart} from '@/lib/shopify';
export async function GET(){try{if(isDemo())return NextResponse.json({demo:true});const id=(await cookies()).get('dyu-cart')?.value;return NextResponse.json({cart:id?await getCart(id):null},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Your bag could not be loaded. Please retry.'},{status:503});}}
export async function POST(req:NextRequest){
 // Next normalizes loopback URLs to localhost; the browser still sends 127.0.0.1.
 // Match the incoming Host, not an internal URL or untrusted forwarded-host header.
 const publicUrl=new URL(req.url);publicUrl.host=req.headers.get('host')||publicUrl.host;
 if(req.headers.get('origin')!==publicUrl.origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
 if(isDemo())return NextResponse.json({error:'Checkout will be available after the shop is connected.'},{status:409});
 try{const b=await req.json();if(!['add','update','remove'].includes(b.action)||!Array.isArray(b.lines)||b.lines.length<1||b.lines.length>30)return NextResponse.json({error:'Invalid bag request.'},{status:400});
 for(const line of b.lines){if(b.action==='remove'){if(typeof line!=='string')throw new Error('Invalid item.');}else if(!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>99||typeof(b.action==='add'?line.merchandiseId:line.id)!=='string')throw new Error('Choose a quantity between 1 and 99.');}
 const jar=await cookies();const id=jar.get('dyu-cart')?.value;if(!id&&b.action!=='add')throw new Error('Your bag has expired. Please add your items again.');
 const cart=await mutateCart(id?b.action:'create',id,b.lines);jar.set('dyu-cart',cart.id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*10});return NextResponse.json({cart});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to update your bag.'},{status:400});}
}
