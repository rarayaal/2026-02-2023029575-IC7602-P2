/**
 * Autenticación de las personas usuarias de la plataforma (UI).
 *
 * La UI inicia sesión con Firebase Authentication y envía el ID token (un JWT firmado
 * por Google) en "Authorization: Bearer <idToken>". El API verifica la firma, la
 * expiración y el proyecto con el Admin SDK, y deja la identidad en req.user.
 */
import { auth } from '../config/firebase.js';
import { ApiError } from './errors.js';

export async function requireUser(req, res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, idToken] = header.split(' ');

  if (scheme !== 'Bearer' || !idToken) {
    return next(new ApiError(401, 'MISSING_ID_TOKEN', 'Bearer Firebase ID token required'));
  }

  try {
    const decoded = await auth().verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email ?? null };
    return next();
  } catch {
    return next(new ApiError(401, 'INVALID_ID_TOKEN', 'Firebase ID token is not valid or expired'));
  }
}
