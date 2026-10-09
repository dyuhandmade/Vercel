import {test, expect} from '@playwright/test';
import {inspectLaunchEnvironment} from '../scripts/lib/launch-readiness.mjs';

const ready = {
  NEXT_PUBLIC_SITE_URL:'https://shop.example.com', CUSTOMER_ACCOUNT_SITE_URL:'https://shop.example.com',
  DEMO_MODE:'false', SITE_INDEXING_ENABLED:'true', SHOPIFY_STORE_DOMAIN:'dyuhandmade.myshopify.com',
  SHOPIFY_STOREFRONT_PUBLIC_TOKEN:'fixture-storefront-token', SHOPIFY_API_VERSION:'2026-07',
  SHOPIFY_CUSTOMER_ACCOUNT_API_VERSION:'2026-07', SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID:'fixture-public-client',
  SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID:'76637307099', CUSTOMER_ACCOUNT_SESSION_SECRET:'fixture-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ',
};

test('configuration readiness retains external payment and operational gates',()=>{
  const result=inspectLaunchEnvironment(ready);
  expect(result.configurationReady).toBe(true);
  expect(result.externalChecksRequired).toContain('Completed no-charge checkout and account-order test');
});

test('preview, insecure, credentialed, path and mismatched origins cannot pass launch checks',()=>{
  for(const url of ['http://shop.example.com','https://rare-today-comparing-midi.trycloudflare.com','https://127.0.0.1','https://[::1]','https://localhost','https://name:secret@shop.example.com','https://shop.example.com/account','https://shop.example.com?preview=true']){
    expect(inspectLaunchEnvironment({...ready,NEXT_PUBLIC_SITE_URL:url,CUSTOMER_ACCOUNT_SITE_URL:url}).configurationReady,url).toBe(false);
  }
  expect(inspectLaunchEnvironment({...ready,CUSTOMER_ACCOUNT_SITE_URL:'https://other.example.com'}).configurationReady).toBe(false);
});

test('launch check catches demo, unset indexing, weak secrets and exposed credentials without logging them',()=>{
  const env={...ready,DEMO_MODE:'true',SITE_INDEXING_ENABLED:'false',CUSTOMER_ACCOUNT_SESSION_SECRET:'a'.repeat(40),NEXT_PUBLIC_ADMIN_ACCESS_TOKEN:'PRIVATE-FIXTURE-DO-NOT-PRINT'};
  const result=inspectLaunchEnvironment(env);
  expect(result.configurationReady).toBe(false);
  expect(result.checks.filter(check=>check.status==='fail').map(check=>check.id)).toEqual(expect.arrayContaining(['live-data','indexing','session-secret','public-secrets']));
  expect(JSON.stringify(result)).not.toContain(env.NEXT_PUBLIC_ADMIN_ACCESS_TOKEN);
  expect(inspectLaunchEnvironment({...ready,SHOPIFY_STOREFRONT_PUBLIC_TOKEN:'shpat_wrong-api'}).configurationReady).toBe(false);
});
