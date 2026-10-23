/**
 * Prueba de punta a punta contra Firestore y Firebase Authentication reales.
 *
 *   npm run dev          # en otra terminal
 *   npm run e2e
 *
 * Crea una cuenta temporal, recorre el flujo de la UI (dominio, URLs, API keys,
 * usuarios, sesiones), consulta los endpoints internos como lo haría el Zonal Cache,
 * y al final borra la cuenta con todos sus datos.
 *
 * Requiere FIREBASE_WEB_API_KEY (Project settings > General > Web API Key) para
 * iniciar sesión como lo hace la UI, e INTERNAL_SERVICE_TOKEN para los endpoints internos.
 */
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { requireEnv } from '../src/config/env.js';
import { db } from '../src/config/firebase.js';

const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const serviceToken = requireEnv('INTERNAL_SERVICE_TOKEN');
const webApiKey = requireEnv('FIREBASE_WEB_API_KEY');

const run = randomBytes(4).toString('hex');
const email = `e2e-${run}@example.com`;
const password = randomBytes(12).toString('base64url');
const domain = `e2e-${run}.example.com`;
let idToken;
let step = 0;

async function call(method, path, { body, token = idToken, service = false } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (service) headers.authorization = `Bearer ${serviceToken}`;
  else if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

function check(label, actual, expectedStatus) {
  step += 1;
  assert.equal(actual.status, expectedStatus, `${label}: ${JSON.stringify(actual.body)}`);
  console.log(`  ok ${String(step).padStart(2)}  ${label} → ${actual.status}`);
  return actual.body;
}

async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${webApiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  assert.ok(data.idToken, `sign in failed: ${JSON.stringify(data.error)}`);
  return data.idToken;
}

console.log(`[e2e] ${BASE}  account ${email}  domain ${domain}`);
try {
  // ---- T-27 usuarios
  check('register account', await call('POST', '/api/users', { body: { displayName: 'E2E', email, password } }), 201);
  check('register same email again', await call('POST', '/api/users', { body: { displayName: 'E2E', email, password } }), 409);
  idToken = await signIn();
  check('get profile', await call('GET', '/api/users/me'), 200);
  check('without token', await call('GET', '/api/users/me', { token: null }), 401);

  // ---- T-28 dominios
  const origin = { scheme: 'http', host: 'httpbin.org', port: 80 };
  const created = check('register domain', await call('POST', '/api/domains', { body: { name: domain, origin, cacheSizeBytes: 1000 } }), 201);
  assert.equal(created.verification.status, 'pending');
  check('register same domain again', await call('POST', '/api/domains', { body: { name: domain, origin, cacheSizeBytes: 1000 } }), 409);
  const list = check('list domains', await call('GET', '/api/domains'), 200);
  assert.deepEqual(list.domains.map((d) => d.name), [domain]);
  const verify = check('verify without TXT record', await call('POST', `/api/domains/${domain}/verify`), 200);
  assert.equal(verify.verified, false);

  // ---- T-29 URLs
  const base = `/api/domains/${domain}/urls`;
  const fileTypes = { html: { ttlSeconds: 60, policy: 'LRU' }, '*': { ttlSeconds: 30, policy: 'RANDOM' } };
  const pub = check('create public url', await call('POST', base, { body: { pattern: '/*', cacheSizeBytes: 500, auth: { type: 'none' }, fileTypes } }), 201);
  check('duplicate pattern', await call('POST', base, { body: { pattern: '/*', cacheSizeBytes: 1, auth: { type: 'none' } } }), 409);
  check('exceed domain cache size', await call('POST', base, { body: { pattern: '/big/*', cacheSizeBytes: 600, auth: { type: 'none' } } }), 400);
  const api = check('create api_key url', await call('POST', base, { body: { pattern: '/api/*', cacheSizeBytes: 200, auth: { type: 'api_key' } } }), 201);
  const adm = check('create user_password url', await call('POST', base, { body: { pattern: '/admin/*', cacheSizeBytes: 200, auth: { type: 'user_password' } } }), 201);
  const urls = check('list urls', await call('GET', base), 200);
  assert.deepEqual(urls.urls.map((u) => u.pattern), ['/admin/*', '/api/*', '/*']);
  check('update public url', await call('PUT', `${base}/${pub.id}`, { body: { pattern: '/*', cacheSizeBytes: 400, auth: { type: 'none' }, fileTypes } }), 200);

  // ---- T-30 API keys
  const rawKey = `pk_${randomBytes(32).toString('hex')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyBody = { name: 'e2e', prefix: rawKey.slice(0, 10), keyHash };
  check('api key on wrong auth type', await call('POST', `${base}/${adm.id}/api-keys`, { body: keyBody }), 409);
  check('create api key', await call('POST', `${base}/${api.id}/api-keys`, { body: keyBody }), 201);
  const keys = check('list api keys', await call('GET', `${base}/${api.id}/api-keys`), 200);
  assert.equal(keys.apiKeys.length, 1);

  // ---- T-30 usuarios de URL y sesiones
  const users = `${base}/${adm.id}/users`;
  check('create url user', await call('POST', users, { body: { username: 'ana', password: 'secreto1' } }), 201);
  check('duplicate url user', await call('POST', users, { body: { username: 'ana', password: 'secreto1' } }), 409);
  check('list url users', await call('GET', users), 200);
  const login = { domain, urlId: adm.id, username: 'ana' };
  check('login with wrong password', await call('POST', '/api/sessions', { token: null, body: { ...login, password: 'nope' } }), 401);
  const session = check('login', await call('POST', '/api/sessions', { token: null, body: { ...login, password: 'secreto1' } }), 201);

  // ---- T-31 vista del Zonal Cache (el dominio todavía no está verificado)
  check('cache config of unverified domain', await call('GET', `/api/internal/domains/${domain}/config`, { service: true }), 404);
  // Simula que el registro TXT ya se publicó.
  await db().collection('domains').doc(domain).update({ 'verification.status': 'verified', 'verification.verifiedAt': FieldValue.serverTimestamp() });
  const config = check('cache config', await call('GET', `/api/internal/domains/${domain}/config`, { service: true }), 200);
  assert.equal(config.urls.length, 3);
  const keyCheck = check('cache validates api key', await call('POST', '/api/internal/validate/api-key', { service: true, body: { domain, urlId: api.id, apiKey: rawKey } }), 200);
  assert.equal(keyCheck.valid, true);
  const sessionCheck = check('cache validates session', await call('POST', '/api/internal/validate/session', { service: true, body: { domain, urlId: adm.id, sessionToken: session.sessionToken } }), 200);
  assert.equal(sessionCheck.valid, true);

  // ---- cierre de sesión y revocaciones
  check('logout', await call('DELETE', '/api/sessions', { token: null, body: { sessionToken: session.sessionToken } }), 204);
  const afterLogout = check('session after logout', await call('POST', '/api/internal/validate/session', { service: true, body: { domain, urlId: adm.id, sessionToken: session.sessionToken } }), 200);
  assert.equal(afterLogout.valid, false);
  check('change url user password', await call('PUT', `${users}/ana/password`, { body: { newPassword: 'secreto2' } }), 200);
  check('delete api key', await call('DELETE', `${base}/${api.id}/api-keys/${keyHash}`), 204);
  const afterDelete = check('api key after delete', await call('POST', '/api/internal/validate/api-key', { service: true, body: { domain, urlId: api.id, apiKey: rawKey } }), 200);
  assert.equal(afterDelete.valid, false);
  check('delete url user', await call('DELETE', `${users}/ana`), 204);
  check('delete url', await call('DELETE', `${base}/${pub.id}`), 204);
  check('delete domain', await call('DELETE', `/api/domains/${domain}`), 204);
  check('domain is gone', await call('GET', `/api/domains/${domain}`), 404);

  console.log(`[e2e] all ${step} checks passed`);
} finally {
  if (idToken) {
    const res = await call('DELETE', '/api/users/me');
    console.log(`[e2e] cleanup: delete account → ${res.status}`);
  }
}
