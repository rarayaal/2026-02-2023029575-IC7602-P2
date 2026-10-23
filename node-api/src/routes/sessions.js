/**
 * Sesiones de usuarios de URLs protegidas (T-30). Las usa el formulario de
 * autenticación de la UI que redirige el Zonal Cache (docs/contrato-cache-api.md §3).
 * Son públicas: quien llama es la persona que intenta entrar a la URL protegida.
 */
import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Timestamp } from 'firebase-admin/firestore';
import { intEnv } from '../config/env.js';
import { db } from '../config/firebase.js';
import { domainRef } from '../lib/firestore.js';
import { sha256Hex } from '../lib/hash.js';
import { requireString } from '../lib/validation.js';
import { ApiError } from '../middleware/errors.js';

const router = Router();

// Un único error para usuario inexistente o contraseña incorrecta, para no revelar
// qué usuarios existen.
const invalidCredentials = () =>
  new ApiError(401, 'INVALID_CREDENTIALS', 'Username or password is not valid');

// Hash bcrypt válido que no corresponde a ninguna contraseña real. Se compara contra él
// cuando el usuario no existe, para que la respuesta tarde lo mismo en ambos casos.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), 10);

router.post('/', async (req, res) => {
  const domain = requireString(req.body?.domain, 'domain', { max: 253 });
  const urlId = requireString(req.body?.urlId, 'urlId');
  const username = requireString(req.body?.username, 'username', { max: 30 });
  const password = requireString(req.body?.password, 'password', { max: 128 });
  // Una "/" en los IDs formaría otra ruta de Firestore.
  if ([domain, urlId, username].some((value) => value.includes('/'))) throw invalidCredentials();

  const urlRef = domainRef(domain).collection('urls').doc(urlId);
  const [urlDoc, userDoc] = await Promise.all([
    urlRef.get(),
    urlRef.collection('users').doc(username).get(),
  ]);

  const hash = userDoc.exists ? userDoc.get('passwordHash') : DUMMY_HASH;
  const passwordOk = await bcrypt.compare(password, hash);
  if (!urlDoc.exists || urlDoc.get('auth.type') !== 'user_password' || !userDoc.exists || !passwordOk) {
    throw invalidCredentials();
  }

  const sessionToken = `st_${randomBytes(32).toString('hex')}`;
  const expiresAt = Timestamp.fromMillis(Date.now() + intEnv('SESSION_TTL_SECONDS', 3600) * 1000);
  await db().collection('sessions').doc(sha256Hex(sessionToken)).set({
    domain: urlRef.parent.parent.id,
    urlId,
    username,
    createdAt: Timestamp.now(),
    expiresAt,
  });

  res.status(201).json({ sessionToken, expiresAt: expiresAt.toDate().toISOString() });
});

/** Cerrar sesión. Es idempotente: si la sesión no existe también responde 204. */
router.delete('/', async (req, res) => {
  const sessionToken = requireString(req.body?.sessionToken, 'sessionToken');
  await db().collection('sessions').doc(sha256Hex(sessionToken)).delete();
  res.sendStatus(204);
});

export default router;
