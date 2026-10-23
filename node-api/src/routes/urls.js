/**
 * URLs de un dominio con su configuración de caché (T-29), y las credenciales que
 * las protegen: API keys y usuarios con contraseña (T-30).
 *
 * Se monta en /api/domains/:domain/urls, después de requireUser.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';
import { compareBySpecificity } from '../lib/config.js';
import {
  deleteUrlCascade,
  deleteWhere,
  loadOwnedDomain,
  loadOwnedUrl,
  requireAuthType,
  toIso,
} from '../lib/firestore.js';
import {
  validateApiKeyBody,
  validatePassword,
  validateUrlBody,
  validateUsername,
} from '../lib/validation.js';
import { ApiError } from '../middleware/errors.js';

const router = Router({ mergeParams: true });

const ALREADY_EXISTS = 6; // código gRPC que devuelve create() si el documento existe
const bcryptRounds = () => Number.parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);

const toUrl = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    pattern: data.pattern,
    cacheSizeBytes: data.cacheSizeBytes,
    auth: data.auth,
    fileTypes: data.fileTypes ?? {},
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
};

/**
 * Reglas que dependen de las demás URLs del dominio: el patrón no se repite y la suma
 * de los tamaños de caché no supera el tamaño del dominio.
 */
async function checkAgainstSiblings(domain, url, excludeId = null) {
  const siblings = (await domain.ref.collection('urls').get()).docs.filter((d) => d.id !== excludeId);

  if (siblings.some((d) => d.get('pattern') === url.pattern)) {
    throw new ApiError(409, 'PATTERN_ALREADY_EXISTS', `Pattern "${url.pattern}" already exists`);
  }

  const used = siblings.reduce((sum, d) => sum + d.get('cacheSizeBytes'), 0);
  const limit = domain.doc.get('cacheSizeBytes');
  if (used + url.cacheSizeBytes > limit) {
    throw new ApiError(
      400,
      'CACHE_SIZE_EXCEEDED',
      `URLs would use ${used + url.cacheSizeBytes} bytes, domain limit is ${limit} bytes (${limit - used} available)`,
    );
  }
}

/* ------------------------------------------------------------------ URLs (T-29) */

router.get('/', async (req, res) => {
  const domain = await loadOwnedDomain(req.params.domain, req.user.uid);
  const snapshot = await domain.ref.collection('urls').get();
  res.json({ urls: snapshot.docs.map(toUrl).sort(compareBySpecificity) });
});

router.post('/', async (req, res) => {
  const url = validateUrlBody(req.body);
  const domain = await loadOwnedDomain(req.params.domain, req.user.uid);
  await checkAgainstSiblings(domain, url);

  const ref = await domain.ref.collection('urls').add({
    ...url,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  res.status(201).json(toUrl(await ref.get()));
});

router.get('/:urlId', async (req, res) => {
  const { doc } = await loadOwnedUrl(req.params.domain, req.params.urlId, req.user.uid);
  res.json(toUrl(doc));
});

/** Reemplaza la configuración. Si cambia el mecanismo de autenticación, borra las credenciales del anterior. */
router.put('/:urlId', async (req, res) => {
  const url = validateUrlBody(req.body);
  const { domain, ref, doc } = await loadOwnedUrl(req.params.domain, req.params.urlId, req.user.uid);
  await checkAgainstSiblings(domain, url, doc.id);

  const previousType = doc.get('auth.type');
  if (previousType === 'api_key' && url.auth.type !== 'api_key') {
    await deleteWhere('apiKeys', { domain: domain.doc.id, urlId: doc.id });
  }
  if (previousType === 'user_password' && url.auth.type !== 'user_password') {
    await deleteWhere('sessions', { domain: domain.doc.id, urlId: doc.id });
    await db().recursiveDelete(ref.collection('users'));
  }

  await ref.update({ ...url, updatedAt: FieldValue.serverTimestamp() });
  res.json(toUrl(await ref.get()));
});

router.delete('/:urlId', async (req, res) => {
  const { domain, ref } = await loadOwnedUrl(req.params.domain, req.params.urlId, req.user.uid);
  await deleteUrlCascade(domain.doc.id, ref);
  res.sendStatus(204);
});

/* --------------------------------------------------------------- API keys (T-30) */

const toApiKey = (doc) => ({
  id: doc.id,
  name: doc.get('name'),
  prefix: doc.get('prefix'),
  createdAt: toIso(doc.get('createdAt')),
});

router.get('/:urlId/api-keys', async (req, res) => {
  const { domain, doc } = await loadOwnedUrl(req.params.domain, req.params.urlId, req.user.uid);
  const snapshot = await db()
    .collection('apiKeys')
    .where('domain', '==', domain.doc.id)
    .where('urlId', '==', doc.id)
    .get();
  res.json({ apiKeys: snapshot.docs.map(toApiKey) });
});

/** La UI envía el hash de la key (ver validateApiKeyBody); el ID del documento es ese hash. */
router.post('/:urlId/api-keys', async (req, res) => {
  const key = validateApiKeyBody(req.body);
  const { domain, doc } = await loadOwnedUrl(req.params.domain, req.params.urlId, req.user.uid);
  requireAuthType(doc, 'api_key');

  const ref = db().collection('apiKeys').doc(key.keyHash);
  try {
    await ref.create({
      domain: domain.doc.id,
      urlId: doc.id,
      name: key.name,
      prefix: key.prefix,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if (err.code === ALREADY_EXISTS) {
      throw new ApiError(409, 'API_KEY_ALREADY_EXISTS', 'An API key with this hash already exists');
    }
    throw err;
  }
  res.status(201).json(toApiKey(await ref.get()));
});

router.delete('/:urlId/api-keys/:keyId', async (req, res) => {
  const { domain, doc } = await loadOwnedUrl(req.params.domain, req.params.urlId, req.user.uid);
  const ref = db().collection('apiKeys').doc(req.params.keyId);
  const key = await ref.get();
  if (!key.exists || key.get('domain') !== domain.doc.id || key.get('urlId') !== doc.id) {
    throw new ApiError(404, 'API_KEY_NOT_FOUND', 'API key does not exist for this URL');
  }
  await ref.delete();
  res.sendStatus(204);
});

/* ------------------------------------------- Usuarios de URL protegida (T-30) */

const toUrlUser = (doc) => ({
  username: doc.id,
  createdAt: toIso(doc.get('createdAt')),
  updatedAt: toIso(doc.get('updatedAt')),
});

router.get('/:urlId/users', async (req, res) => {
  const { ref } = await loadOwnedUrl(req.params.domain, req.params.urlId, req.user.uid);
  const snapshot = await ref.collection('users').get();
  res.json({ users: snapshot.docs.map(toUrlUser) });
});

router.post('/:urlId/users', async (req, res) => {
  const username = validateUsername(req.body?.username);
  const password = validatePassword(req.body?.password);
  const { ref, doc } = await loadOwnedUrl(req.params.domain, req.params.urlId, req.user.uid);
  requireAuthType(doc, 'user_password');

  const userRef = ref.collection('users').doc(username);
  try {
    await userRef.create({
      username,
      passwordHash: await bcrypt.hash(password, bcryptRounds()),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if (err.code === ALREADY_EXISTS) {
      throw new ApiError(409, 'USER_ALREADY_EXISTS', `User "${username}" already exists`);
    }
    throw err;
  }
  res.status(201).json(toUrlUser(await userRef.get()));
});

/** Cambiar la contraseña cierra las sesiones abiertas de ese usuario. */
router.put('/:urlId/users/:username/password', async (req, res) => {
  const newPassword = validatePassword(req.body?.newPassword, 'newPassword');
  const { domain, ref, doc } = await loadOwnedUrl(req.params.domain, req.params.urlId, req.user.uid);
  const userRef = ref.collection('users').doc(req.params.username);
  if (!(await userRef.get()).exists) {
    throw new ApiError(404, 'USER_NOT_FOUND', `User "${req.params.username}" does not exist`);
  }

  await userRef.update({
    passwordHash: await bcrypt.hash(newPassword, bcryptRounds()),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await deleteWhere('sessions', { domain: domain.doc.id, urlId: doc.id, username: userRef.id });
  res.json(toUrlUser(await userRef.get()));
});

router.delete('/:urlId/users/:username', async (req, res) => {
  const { domain, ref, doc } = await loadOwnedUrl(req.params.domain, req.params.urlId, req.user.uid);
  const userRef = ref.collection('users').doc(req.params.username);
  if (!(await userRef.get()).exists) {
    throw new ApiError(404, 'USER_NOT_FOUND', `User "${req.params.username}" does not exist`);
  }
  await userRef.delete();
  await deleteWhere('sessions', { domain: domain.doc.id, urlId: doc.id, username: userRef.id });
  res.sendStatus(204);
});

export default router;
