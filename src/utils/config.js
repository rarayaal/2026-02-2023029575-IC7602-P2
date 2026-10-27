/**
 * Módulo centralizado para lectura y validación de variables de entorno VITE_*.
 * Garantiza que ningún valor de configuración esté quemado en componentes o servicios.
 */

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {});

const rawApiBaseUrl = env.VITE_API_BASE_URL;
const rawAppTitle = env.VITE_APP_TITLE;
const rawAppEnv = env.VITE_APP_ENV;
const rawUiPort = env.UI_PORT;

// Variables para Firebase Web SDK
const rawFirebaseApiKey = env.VITE_FIREBASE_API_KEY;
const rawFirebaseAuthDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
const rawFirebaseProjectId = env.VITE_FIREBASE_PROJECT_ID;
const rawFirebaseStorageBucket = env.VITE_FIREBASE_STORAGE_BUCKET;
const rawFirebaseMessagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const rawFirebaseAppId = env.VITE_FIREBASE_APP_ID;

export const isApiConfigured = Boolean(rawApiBaseUrl && rawApiBaseUrl.trim() !== '');
export const isFirebaseConfigured = Boolean(
  rawFirebaseApiKey &&
  rawFirebaseApiKey.trim() !== '' &&
  rawFirebaseProjectId &&
  rawFirebaseProjectId.trim() !== ''
);

if (!isApiConfigured) {
  console.warn(
    '[CONFIG WARNING] La variable de entorno VITE_API_BASE_URL no está configurada. Las peticiones al REST API fallarán de forma controlada hasta que se defina en el archivo .env o en las variables del entorno.'
  );
}

if (!isFirebaseConfigured) {
  console.warn(
    '[FIREBASE WARNING] Las credenciales de Firebase Web SDK (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID) no están configuradas en .env. La autenticación con Firebase requerirá configurar estas variables.'
  );
}

export const firebaseConfig = {
  apiKey: rawFirebaseApiKey || '',
  authDomain: rawFirebaseAuthDomain || (rawFirebaseProjectId ? `${rawFirebaseProjectId}.firebaseapp.com` : ''),
  projectId: rawFirebaseProjectId || '',
  storageBucket: rawFirebaseStorageBucket || (rawFirebaseProjectId ? `${rawFirebaseProjectId}.appspot.com` : ''),
  messagingSenderId: rawFirebaseMessagingSenderId || '',
  appId: rawFirebaseAppId || '',
};

export const config = {
  // URL base del backend REST API (únicamente desde VITE_API_BASE_URL, sin fallback quemado)
  apiBaseUrl: rawApiBaseUrl || '',

  // Título de la aplicación (únicamente desde VITE_APP_TITLE)
  appTitle: rawAppTitle || '',

  // Entorno de ejecución (únicamente desde VITE_APP_ENV)
  appEnv: rawAppEnv || '',

  // Puerto de la interfaz (configurable, no es valor quemado de negocio)
  uiPort: rawUiPort || '',

  // Configuración de Firebase Web
  firebase: firebaseConfig,
  isFirebaseConfigured,

  // Estado de configuración de la API
  isApiConfigured,

  // Modos de compilación de Vite
  isDev: Boolean(env.DEV || env.NODE_ENV === 'development'),
  isProd: Boolean(env.PROD || env.NODE_ENV === 'production'),
};

export default config;
