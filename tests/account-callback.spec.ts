import {test, expect} from '@playwright/test';
import {
  CustomerAuthCallbackError, customerAuthDiagnostic, runCustomerAuthCallback,
  type CustomerCallbackDependencies, type CustomerAuthFlow,
} from '../src/lib/customer-auth-callback';

function fixture(overrides: Partial<CustomerCallbackDependencies> = {}) {
  const calls: string[] = [];
  const flow: CustomerAuthFlow = {state: 'test-state', nonce: 'test-nonce', verifier: 'test-verifier', returnTo: '/account?tab=orders'};
  const dependencies: CustomerCallbackDependencies = {
    readFlow: async () => { calls.push('read'); return {present: true, value: flow}; },
    clearFlow: async () => { calls.push('clear'); },
    discover: async () => { calls.push('discover'); },
    exchange: async (code, verifier) => {
      calls.push('exchange');
      expect(code === 'test-code' && verifier === flow.verifier).toBe(true);
      return {access_token: 'test-access', id_token: 'test-id', refresh_token: 'test-refresh', expires_in: 3600};
    },
    verify: async (idToken, nonce) => {
      calls.push('verify');
      expect(idToken === 'test-id' && nonce === flow.nonce).toBe(true);
      return 'test-customer';
    },
    save: async (token, subject) => {
      calls.push('save');
      expect(token.access_token === 'test-access' && subject === 'test-customer').toBe(true);
    },
    ...overrides,
  };
  return {calls, flow, dependencies, parameters: new URLSearchParams({state: flow.state, code: 'test-code'})};
}

async function failure(parameters: URLSearchParams, dependencies: CustomerCallbackDependencies) {
  try { await runCustomerAuthCallback(parameters, dependencies); }
  catch (error) { return customerAuthDiagnostic(error); }
  throw new Error('Expected callback rejection.');
}

test('callback consumes the flow before exchange, verifies the identity and only then saves a session', async () => {
  const context = fixture();
  expect(await runCustomerAuthCallback(context.parameters, context.dependencies)).toBe('/account?tab=orders');
  expect(context.calls).toEqual(['read', 'clear', 'discover', 'exchange', 'verify', 'save']);
});

test('missing and invalid or expired flow cookies have distinct bounded classifications', async () => {
  for (const [present, reason] of [[false, 'missing_flow'], [true, 'expired_or_invalid_flow']] as const) {
    const context = fixture({readFlow: async () => ({present, value: null})});
    expect(await failure(context.parameters, context.dependencies)).toEqual({stage: 'flow', reason});
    expect(context.calls).toEqual(['clear']);
  }
});

test('mismatched and duplicate state are rejected without calling Shopify or saving a session', async () => {
  for (const parameters of [new URLSearchParams({state: 'other-state', code: 'test-code'}), new URLSearchParams('state=test-state&state=test-state&code=test-code')]) {
    const context = fixture();
    expect(await failure(parameters, context.dependencies)).toEqual({stage: 'authorization', reason: 'state_mismatch'});
    expect(context.calls).toEqual(['read', 'clear']);
  }
});

test('provider errors expose only standard OAuth enums, never provider details', async () => {
  for (const [providerError, expected] of [['access_denied', 'access_denied'], ['sensitive-provider-message', 'other']]) {
    const context = fixture();
    context.parameters.set('error', providerError);
    context.parameters.set('error_description', 'never-log-this-private-detail');
    expect(await failure(context.parameters, context.dependencies)).toEqual({stage: 'authorization', reason: 'provider_error', oauthError: expected});
    expect(context.calls).toEqual(['read', 'clear']);
  }
});

test('token exchange status and OAuth error survive classification without response bodies', async () => {
  const context = fixture({exchange: async () => { throw new CustomerAuthCallbackError({stage: 'token', reason: 'http_error', httpStatus: 400, oauthError: 'invalid_grant'}); }});
  expect(await failure(context.parameters, context.dependencies)).toEqual({stage: 'token', reason: 'http_error', httpStatus: 400, oauthError: 'invalid_grant'});
  expect(context.calls).not.toContain('verify');
  expect(context.calls).not.toContain('save');
});

test('a failed identity verification never saves a session and logs only a JWT code and claim name', async () => {
  const context = fixture({verify: async () => { throw Object.assign(new Error('never-log-token-or-claim-value'), {code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim: 'aud'}); }});
  expect(await failure(context.parameters, context.dependencies)).toEqual({stage: 'identity', reason: 'verification_failed', jwtError: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim: 'aud'});
  expect(context.calls).not.toContain('save');
});

test('cookie overflow is identified after verification without exposing the session contents', async () => {
  const context = fixture({save: async () => { throw new CustomerAuthCallbackError({stage: 'session', reason: 'cookie_size'}); }});
  expect(await failure(context.parameters, context.dependencies)).toEqual({stage: 'session', reason: 'cookie_size'});
  expect(context.calls).toContain('verify');
});

test('unexpected errors and untrusted diagnostic fields cannot leak arbitrary strings', () => {
  expect(customerAuthDiagnostic(new Error('private-error-message'))).toEqual({stage: 'callback', reason: 'unexpected'});
  const error = new CustomerAuthCallbackError({stage: 'token', reason: 'http_error'});
  Object.assign(error.diagnostic, {stage: 'private-stage', reason: 'private-reason', httpStatus: 9999, oauthError: 'private-oauth', jwtError: 'private-jwt', claim: 'private-claim', subjectShape: 'private-subject', message: 'private-message'});
  expect(customerAuthDiagnostic(error)).toEqual({stage: 'callback', reason: 'unexpected', oauthError: 'other', jwtError: 'other', claim: 'other', subjectShape: 'other'});
});
