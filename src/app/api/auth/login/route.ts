import {NextRequest, NextResponse} from 'next/server';
import {beginCustomerLogin, getAccountConfig} from '@/lib/customer-auth';
import {ACCOUNT_NO_STORE} from '@/lib/account-security';
import {CUSTOMER_LOGIN_UNAVAILABLE, getCustomerLoginRedirect} from '@/lib/customer-login';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const config = getAccountConfig();
  // The flow cookie and registered callback must share the same canonical host.
  const redirect = await getCustomerLoginRedirect(request, config?.siteOrigin, request.nextUrl.searchParams.get('returnTo'));
  if (redirect) {
    // Relative failures stay on the browser's host, even behind a proxy/bind URL.
    return new NextResponse(null, {status: 303, headers: {...ACCOUNT_NO_STORE, Location: redirect}});
  }
  try {
    const destination = await beginCustomerLogin(request.nextUrl.searchParams.get('returnTo'));
    return NextResponse.redirect(destination, {status: 303, headers: ACCOUNT_NO_STORE});
  } catch {
    return new NextResponse(null, {status: 303, headers: {...ACCOUNT_NO_STORE, Location: CUSTOMER_LOGIN_UNAVAILABLE}});
  }
}
