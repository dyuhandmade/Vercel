import {NextRequest, NextResponse} from 'next/server';
import {completeCustomerLogin, getAccountConfig} from '@/lib/customer-auth';
import {ACCOUNT_NO_STORE} from '@/lib/account-security';
import {customerAuthDiagnostic} from '@/lib/customer-auth-callback';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const config = getAccountConfig();
  if (!config) return NextResponse.redirect(new URL('/account?error=unavailable', request.url), {status: 303, headers: ACCOUNT_NO_STORE});
  try {
    const destination = await completeCustomerLogin(request.nextUrl.searchParams);
    return NextResponse.redirect(new URL(destination, config.siteOrigin), {status: 303, headers: ACCOUNT_NO_STORE});
  } catch (error) {
    console.warn('Customer account sign-in failed', customerAuthDiagnostic(error));
    return NextResponse.redirect(`${config.siteOrigin}/account?error=signin`, {status: 303, headers: ACCOUNT_NO_STORE});
  }
}
