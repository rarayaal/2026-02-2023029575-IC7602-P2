/**
 * Módulo centralizado de inicialización de Firebase Web SDK (T-33 a T-38).
 * Administra la sesión y tokens de Firebase Authentication para la UI de administración.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { config, isFirebaseConfigured } from '../utils/config.js';

let firebaseApp = null;
let firebaseAuth = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config.firebase);
    firebaseAuth = getAuth(firebaseApp);
  } catch (err) {
    console.error('[FIREBASE INIT ERROR] No se pudo inicializar Firebase Web SDK:', err);
  }
}

export const app = firebaseApp;
export const auth = firebaseAuth;
export { isFirebaseConfigured };

/**
 * Obtiene el ID Token de Firebase del usuario actualmente autenticado.
 * Si el token ha expirado o está próximo a expirar, Firebase lo renueva automáticamente.
 *
 * @param {boolean} [forceRefresh=false] Forzar renovación del token con los servidores de Google
 * @returns {Promise<string|null>} ID Token (JWT firmado) o null si no hay sesión activa
 */
export async function getIdToken(forceRefresh = false) {
  if (!auth || !auth.currentUser) {
    return null;
  }
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch (err) {
    console.warn('[AUTH TOKEN WARNING] No se pudo obtener el ID token de Firebase:', err.message);
    return null;
  }
}

/**
 * Traduce códigos de error nativos de Firebase Authentication a mensajes comprensibles en español.
 *
 * @param {any} error
 * @returns {string} Mensaje de error legible
 */
export function translateFirebaseAuthError(error) {
  if (!error) return 'Ocurrió un error inesperado de autenticación.';

  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo electrónico o contraseña incorrectos. Verifique sus credenciales.';
    case 'auth/invalid-email':
      return 'La dirección de correo electrónico no tiene un formato válido.';
    case 'auth/user-disabled':
      return 'Esta cuenta de usuario ha sido deshabilitada por el administrador.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos consecutivos. Por favor, intente nuevamente más tarde.';
    case 'auth/network-request-failed':
      return 'Error de conexión de red al comunicarse con el servidor de autenticación.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con este correo electrónico.';
    case 'auth/weak-password':
      return 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
    default:
      return error.message || 'Error de autenticación. Por favor, intente de nuevo.';
  }
}

/**
 * Inicia sesión en Firebase Authentication mediante correo y contraseña.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ ok: boolean, user: any, token: string|null, error: string|null }>}
 */
export async function loginWithEmailAndPassword(email, password) {
  if (!isFirebaseConfigured || !auth) {
    return {
      ok: false,
      user: null,
      token: null,
      error: 'Firebase Authentication no está configurado. Verifique las variables VITE_FIREBASE_* en su archivo .env.',
    };
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const token = await credential.user.getIdToken();
    return {
      ok: true,
      user: credential.user,
      token,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      user: null,
      token: null,
      error: translateFirebaseAuthError(err),
    };
  }
}

/**
 * Cierra la sesión activa en Firebase Authentication.
 *
 * @returns {Promise<{ ok: boolean, error: string|null }>}
 */
export async function logoutUser() {
  if (!auth) {
    return { ok: true, error: null };
  }
  try {
    await signOut(auth);
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: translateFirebaseAuthError(err) };
  }
}

export default {
  app,
  auth,
  isFirebaseConfigured,
  getIdToken,
  loginWithEmailAndPassword,
  logoutUser,
  translateFirebaseAuthError,
};
