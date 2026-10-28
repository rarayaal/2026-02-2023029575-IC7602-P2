/**
 * Carga datos de prueba en Firestore para probar los endpoints internos (T-31)
 * sin depender de la UI. Es idempotente: se puede correr varias veces.
 *
 *   npm run seed
 *
 * Crea un dominio verificado con tres URLs, una por cada mecanismo de autenticación,
 * y genera una API key, un usuario y una sesión. Los secretos generados se escriben en
 * .seed-output.json (ignorado por git) y no se imprimen en consola.
 */
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../src/config/firebase.js';
import { sha256Hex } from '../src/lib/hash.js';

const DOMAIN = process.env.SEED_DOMAIN ?? 'app.local';
const ORIGIN = {
  scheme: process.env.SEED_ORIGIN_SCHEME ?? 'http',
  host: process.env.SEED_ORIGIN_HOST ?? 'httpbin.org',
  port: Number(process.env.SEED_ORIGIN_PORT ?? 80),
};
const MB = 1024 * 1024;

const firestore = db();
const now = Timestamp.now();
const domainRef = firestore.collection('domains').doc(DOMAIN);

// Borra las keys y sesiones de corridas anteriores de este dominio.
for (const collection of ['apiKeys', 'sessions']) {
  const old = await firestore.collection(collection).where('domain', '==', DOMAIN).get();
  await Promise.all(old.docs.map((doc) => doc.ref.delete()));
}

await domainRef.set({
  name: DOMAIN,
  ownerUid: 'seed',
  origin: ORIGIN,
  cacheSizeBytes: 100 * MB,
  verification: { status: 'verified', token: randomBytes(16).toString('hex'), verifiedAt: now },
  createdAt: now,
  updatedAt: now,
});

const urls = {
  public: {
    pattern: '/*',
    cacheSizeBytes: 50 * MB,
    auth: { type: 'none' },
    fileTypes: {
      html: { ttlSeconds: 60, policy: 'LRU' },
      json: { ttlSeconds: 30, policy: 'LFU' },
      png: { ttlSeconds: 86400, policy: 'FIFO' },
      '*': { ttlSeconds: 300, policy: 'RANDOM' },
    },
  },
  admin: {
    pattern: '/admin/*',
    cacheSizeBytes: 10 * MB,
    auth: { type: 'user_password' },
    fileTypes: { '*': { ttlSeconds: 30, policy: 'MRU' } },
  },
  api: {
    pattern: '/api/*',
    cacheSizeBytes: 20 * MB,
    auth: { type: 'api_key' },
    fileTypes: { json: { ttlSeconds: 15, policy: 'LRU' } },
  },
};
for (const [id, data] of Object.entries(urls)) {
  await domainRef.collection('urls').doc(id).set({ ...data, createdAt: now, updatedAt: now });
}

const username = 'ana';
const password = process.env.SEED_USER_PASSWORD ?? randomBytes(9).toString('base64url');
await domainRef
  .collection('urls')
  .doc('admin')
  .collection('users')
  .doc(username)
  .set({ username, passwordHash: await bcrypt.hash(password, 10), createdAt: now, updatedAt: now });

const apiKey = `pk_${randomBytes(32).toString('hex')}`;
await firestore.collection('apiKeys').doc(sha256Hex(apiKey)).set({
  domain: DOMAIN,
  urlId: 'api',
  name: 'seed',
  prefix: apiKey.slice(0, 10),
  createdAt: now,
});

const sessionToken = `st_${randomBytes(32).toString('hex')}`;
await firestore.collection('sessions').doc(sha256Hex(sessionToken)).set({
  domain: DOMAIN,
  urlId: 'admin',
  username,
  createdAt: now,
  expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
});

await writeFile(
  new URL('../.seed-output.json', import.meta.url),
  JSON.stringify({ domain: DOMAIN, username, password, apiKey, sessionToken }, null, 2),
);

console.log(`[seed] domain "${DOMAIN}" ready with urls: ${Object.keys(urls).join(', ')}`);
console.log('[seed] generated secrets written to .seed-output.json');
