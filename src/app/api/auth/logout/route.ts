import {NextRequest, NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {endCustomerLogin, getAccountConfig, isAccountMutationAllowed} from '@/lib/customer-auth';
import {ACCOUNT_NO_STORE} from '@/lib/account-security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isAccountMutationAllowed(request)) return NextResponse.json({error: 'This request could not be verified.'}, {status: 403, headers: ACCOUNT_NO_STORE});
  const destination = await endCustomerLogin();
  // A buyer-bound cart must never pass to the next customer on a shared device.
  const config = getAccountConfig();
  (await cookies()).set('dyu-cart', '', {httpOnly: true, secure: config?.secure ?? true, sameSite: 'lax', path: '/', maxAge: 0});
  return NextResponse.redirect(new URL(destination, config?.siteOrigin || request.url), {status: 303, headers: ACCOUNT_NO_STORE});
}
