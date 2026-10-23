/**
 * Personas usuarias de la plataforma (T-27). Las credenciales las administra
 * Firebase Authentication; Firestore guarda solo el perfil en users/{uid}.
 */
import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { auth, db } from '../config/firebase.js';
import { deleteDomainCascade, toIso } from '../lib/firestore.js';
import { requireString, validateEmail, validatePassword } from '../lib/validation.js';
import { ApiError } from '../middleware/errors.js';
import { requireUser } from '../middleware/userAuth.js';

const router = Router();

const toProfile = (uid, data) => ({
  uid,
  email: data.email,
  displayName: data.displayName,
  createdAt: toIso(data.createdAt),
  updatedAt: toIso(data.updatedAt),
});

/**
 * Registro de cuenta. Es público: crea la cuenta en Firebase Authentication y su
 * perfil. Después la UI inicia sesión con el SDK de Firebase para obtener el ID token.
 */
router.post('/', async (req, res) => {
  const displayName = requireString(req.body?.displayName, 'displayName', { max: 80 });
  const email = validateEmail(req.body?.email);
  const password = validatePassword(req.body?.password);

  let user;
  try {
    user = await auth().createUser({ email, password, displayName });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    }
    if (err.code === 'auth/invalid-password' || err.code === 'auth/invalid-email') {
      throw new ApiError(400, 'INVALID_BODY', err.message);
    }
    throw err;
  }

  const ref = db().collection('users').doc(user.uid);
  await ref.set({
    email,
    displayName,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  res.status(201).json(toProfile(user.uid, doc.data()));
});

router.use(requireUser);

const meRef = (req) => db().collection('users').doc(req.user.uid);

router.get('/me', async (req, res) => {
  const doc = await meRef(req).get();
  if (!doc.exists) throw new ApiError(404, 'USER_NOT_FOUND', 'User profile does not exist');
  res.json(toProfile(doc.id, doc.data()));
});

/** Solo el nombre para mostrar; correo y contraseña se cambian con Firebase Authentication. */
router.put('/me', async (req, res) => {
  const displayName = requireString(req.body?.displayName, 'displayName', { max: 80 });
  const ref = meRef(req);
  if (!(await ref.get()).exists) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User profile does not exist');
  }
  await Promise.all([
    ref.update({ displayName, updatedAt: FieldValue.serverTimestamp() }),
    auth().updateUser(req.user.uid, { displayName }),
  ]);
  const doc = await ref.get();
  res.json(toProfile(doc.id, doc.data()));
});

/** Elimina la cuenta junto con todos sus dominios. */
router.delete('/me', async (req, res) => {
  const domains = await db().collection('domains').where('ownerUid', '==', req.user.uid).get();
  for (const doc of domains.docs) {
    await deleteDomainCascade(doc.ref);
  }
  await meRef(req).delete();
  await auth().deleteUser(req.user.uid);
  res.sendStatus(204);
});

export default router;
