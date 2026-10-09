import {NextRequest, NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {isDemo, getCart, mutateCart, CartMutationError} from '@/lib/shopify';
import {ACCOUNT_NO_STORE, isSameStorefrontOrigin} from '@/lib/account-security';
import {cartChange, validCartId} from '@/lib/cart-validation';
import {readJsonObject, RequestBodyError} from '@/lib/request-body';

const json = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {...ACCOUNT_NO_STORE, Vary: 'Cookie'}});

export async function GET() {
  try {
    if (isDemo()) return json({demo: true});
    const jar = await cookies();
    const id = jar.get('dyu-cart')?.value;
    const cart = validCartId(id) ? await getCart(id) : null;
    if (id && !cart) jar.set('dyu-cart', '', {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0});
    return json({cart});
  } catch { return json({error: 'Your bag could not be loaded. Please retry.'}, 503); }
}

export async function POST(request: NextRequest) {
  if (!isSameStorefrontOrigin(request)) return json({error: 'Invalid request origin.'}, 403);
  if (isDemo()) return json({error: 'Checkout will be available after the shop is connected.'}, 409);
  try {
    const change = cartChange(await readJsonObject(request));
    const jar = await cookies();
    const stored = jar.get('dyu-cart')?.value;
    const id = validCartId(stored) ? stored : undefined;
    if (!id && change.action !== 'add') return json({error: 'Your bag has expired. Please add your items again.'}, 400);
    const cart = await mutateCart(id ? change.action : 'create', id, change.lines);
    jar.set('dyu-cart', cart.id, {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 10});
    return json({cart});
  } catch (error) {
    if (error instanceof RequestBodyError) return json({error: error.message}, error.status);
    if (error instanceof CartMutationError) return json({error: error.message}, 400);
    return json({error: 'Your bag could not be updated. Refresh your bag before trying again.'}, 503);
  }
}
