/**
 * Inicialización perezosa de Firebase Admin SDK.
 *
 * Se inicializa en la primera llamada y no al importar el módulo, para que endpoints
 * como /api/health respondan aunque las credenciales no estén configuradas.
 *
 * Credenciales (cuenta de servicio de Firebase) por variables de entorno:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireEnv } from './env.js';

function app() {
  const [existing] = getApps();
  if (existing) return existing;

  return initializeApp({
    credential: cert({
      projectId: requireEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
      // Vercel y los archivos .env guardan los saltos de línea de la llave como "\n" literal.
      privateKey: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  });
}

export const db = () => getFirestore(app());
export const auth = () => getAuth(app());
