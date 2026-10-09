import {constantTimeAccountEqual, safeAccountReturnTo} from './account-security';

export type CustomerAuthFlow = {state: string; nonce: string; verifier: string; returnTo: string};
export type CustomerTokenResult = {access_token: string; id_token?: string; refresh_token?: string; expires_in: number};

const stages = ['configuration', 'flow', 'authorization', 'discovery', 'token', 'identity', 'session', 'callback'] as const;
const reasons = ['unavailable', 'missing_flow', 'expired_or_invalid_flow', 'invalid_flow', 'state_mismatch', 'invalid_response', 'provider_error', 'http_error', 'network_error', 'invalid_token_response', 'missing_id_token', 'verification_failed', 'cookie_size', 'cookie_read', 'cookie_clear', 'cookie_write', 'unexpected'] as const;
const oauthErrors = ['invalid_request', 'unauthorized_client', 'access_denied', 'unsupported_response_type', 'invalid_scope', 'server_error', 'temporarily_unavailable', 'invalid_client', 'invalid_grant', 'unsupported_grant_type', 'invalid_token', 'login_required', 'interaction_required', 'account_selection_required', 'consent_required', 'other'] as const;
const jwtErrors = ['ERR_JWT_EXPIRED', 'ERR_JWT_CLAIM_VALIDATION_FAILED', 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED', 'ERR_JOSE_ALG_NOT_ALLOWED', 'ERR_JWKS_NO_MATCHING_KEY', 'ERR_JWKS_MULTIPLE_MATCHING_KEYS', 'ERR_JWKS_TIMEOUT', 'ERR_JWKS_INVALID', 'ERR_JWK_INVALID', 'ERR_JWS_INVALID', 'ERR_JWT_INVALID', 'ERR_JOSE_NOT_SUPPORTED', 'ERR_JOSE_GENERIC', 'identity_claims', 'other'] as const;
const claims = ['iss', 'aud', 'exp', 'iat', 'nbf', 'sub', 'nonce', 'azp', 'other'] as const;
const subjectShapes = ['positive_safe_integer', 'empty_string', 'null', 'missing', 'object', 'array', 'other'] as const;

export type CustomerAuthDiagnostic = {
  stage: typeof stages[number]; reason: typeof reasons[number]; httpStatus?: number;
  oauthError?: typeof oauthErrors[number]; jwtError?: typeof jwtErrors[number]; claim?: typeof claims[number]; subjectShape?: typeof subjectShapes[number];
};

export class CustomerAuthCallbackError extends Error {
  constructor(readonly diagnostic: CustomerAuthDiagnostic) {
    // This message is deliberately constant: callers must never attach provider data.
    super('Customer sign-in could not be completed.');
    this.name = 'CustomerAuthCallbackError';
  }
}

export function safeOAuthError(value: unknown): CustomerAuthDiagnostic['oauthError'] {
  return typeof value === 'string' && (oauthErrors as readonly string[]).includes(value)
    ? value as CustomerAuthDiagnostic['oauthError'] : 'other';
}

/** A strict allowlist keeps library messages, arbitrary response fields and user data out of logs. */
export function customerAuthDiagnostic(error: unknown): CustomerAuthDiagnostic {
  if (!(error instanceof CustomerAuthCallbackError)) return {stage: 'callback', reason: 'unexpected'};
  const input = error.diagnostic;
  const result: CustomerAuthDiagnostic = {
    stage: (stages as readonly string[]).includes(input.stage) ? input.stage : 'callback',
    reason: (reasons as readonly string[]).includes(input.reason) ? input.reason : 'unexpected',
  };
  if (Number.isInteger(input.httpStatus) && input.httpStatus! >= 100 && input.httpStatus! <= 599) result.httpStatus = input.httpStatus;
  if (input.oauthError !== undefined) result.oauthError = safeOAuthError(input.oauthError);
  if (input.jwtError !== undefined) result.jwtError = (jwtErrors as readonly string[]).includes(input.jwtError) ? input.jwtError : 'other';
  if (input.claim !== undefined) result.claim = (claims as readonly string[]).includes(input.claim) ? input.claim : 'other';
  if (input.subjectShape !== undefined) result.subjectShape = (subjectShapes as readonly string[]).includes(input.subjectShape) ? input.subjectShape : 'other';
  return result;
}

function identityDiagnostic(error: unknown): CustomerAuthDiagnostic {
  const value = error && typeof error === 'object' ? error as {code?: unknown; claim?: unknown; subjectShape?: unknown} : {};
  const code = typeof value.code === 'string' && (jwtErrors as readonly string[]).includes(value.code) ? value.code as typeof jwtErrors[number] : 'identity_claims';
  const claim = typeof value.claim === 'string' && (claims as readonly string[]).includes(value.claim) ? value.claim as typeof claims[number] : undefined;
  const subjectShape = typeof value.subjectShape === 'string' && (subjectShapes as readonly string[]).includes(value.subjectShape) ? value.subjectShape as typeof subjectShapes[number] : undefined;
  return {stage: 'identity', reason: 'verification_failed', jwtError: code, ...(claim ? {claim} : {}), ...(subjectShape ? {subjectShape} : {})};
}

export type CustomerCallbackDependencies = {
  readFlow(): Promise<{present: boolean; value: CustomerAuthFlow | null}>;
  clearFlow(): Promise<void>;
  discover(): Promise<void>;
  exchange(code: string, verifier: string): Promise<CustomerTokenResult>;
  verify(idToken: string, nonce: string): Promise<string>;
  save(token: CustomerTokenResult & {id_token: string}, subject: string): Promise<void>;
};

/** Callback orchestration is separate from I/O so its rejection paths can be tested without live credentials. */
export async function runCustomerAuthCallback(parameters: URLSearchParams, dependencies: CustomerCallbackDependencies): Promise<string> {
  let stored: Awaited<ReturnType<CustomerCallbackDependencies['readFlow']>>;
  try { stored = await dependencies.readFlow(); }
  catch { throw new CustomerAuthCallbackError({stage: 'flow', reason: 'cookie_read'}); }
  try { await dependencies.clearFlow(); }
  catch { throw new CustomerAuthCallbackError({stage: 'flow', reason: 'cookie_clear'}); }
  if (!stored.present) throw new CustomerAuthCallbackError({stage: 'flow', reason: 'missing_flow'});
  const flow = stored.value;
  if (!flow) throw new CustomerAuthCallbackError({stage: 'flow', reason: 'expired_or_invalid_flow'});
  if (typeof flow.state !== 'string' || typeof flow.nonce !== 'string' || typeof flow.verifier !== 'string') {
    throw new CustomerAuthCallbackError({stage: 'flow', reason: 'invalid_flow'});
  }
  if (parameters.getAll('state').length !== 1 || !constantTimeAccountEqual(parameters.get('state'), flow.state)) {
    throw new CustomerAuthCallbackError({stage: 'authorization', reason: 'state_mismatch'});
  }
  if (parameters.has('error')) throw new CustomerAuthCallbackError({stage: 'authorization', reason: 'provider_error', oauthError: safeOAuthError(parameters.get('error'))});
  const code = parameters.get('code');
  if (!code || code.length > 4096 || parameters.getAll('code').length !== 1) throw new CustomerAuthCallbackError({stage: 'authorization', reason: 'invalid_response'});
  try { await dependencies.discover(); }
  catch (error) {
    if (error instanceof CustomerAuthCallbackError) throw error;
    throw new CustomerAuthCallbackError({stage: 'discovery', reason: 'unavailable'});
  }
  let token: CustomerTokenResult;
  try { token = await dependencies.exchange(code, flow.verifier); }
  catch (error) {
    if (error instanceof CustomerAuthCallbackError) throw error;
    throw new CustomerAuthCallbackError({stage: 'token', reason: 'unexpected'});
  }
  if (!token.id_token) throw new CustomerAuthCallbackError({stage: 'identity', reason: 'missing_id_token'});
  let subject: string;
  try { subject = await dependencies.verify(token.id_token, flow.nonce); }
  catch (error) { throw new CustomerAuthCallbackError(identityDiagnostic(error)); }
  try { await dependencies.save({...token, id_token: token.id_token}, subject); }
  catch (error) {
    if (error instanceof CustomerAuthCallbackError) throw error;
    throw new CustomerAuthCallbackError({stage: 'session', reason: 'cookie_write'});
  }
  return safeAccountReturnTo(flow.returnTo);
}
