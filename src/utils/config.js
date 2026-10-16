/**
 * Módulo centralizado para lectura y validación de variables de entorno VITE_*.
 * Garantiza que ningún valor de configuración esté quemado en componentes o servicios.
 */

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const rawAppTitle = import.meta.env.VITE_APP_TITLE;
const rawAppEnv = import.meta.env.VITE_APP_ENV;
const rawUiPort = import.meta.env.UI_PORT;

export const isApiConfigured = Boolean(rawApiBaseUrl && rawApiBaseUrl.trim() !== '');

if (!isApiConfigured) {
  console.warn(
    '[CONFIG WARNING] La variable de entorno VITE_API_BASE_URL no está configurada. Las peticiones al REST API fallarán de forma controlada hasta que se defina en el archivo .env o en las variables del entorno.'
  );
}

export const config = {
  // URL base del backend REST API (únicamente desde VITE_API_BASE_URL, sin fallback quemado)
  apiBaseUrl: rawApiBaseUrl || '',

  // Título de la aplicación (únicamente desde VITE_APP_TITLE)
  appTitle: rawAppTitle || '',

  // Entorno de ejecución (únicamente desde VITE_APP_ENV)
  appEnv: rawAppEnv || '',

  // Puerto de la interfaz (configurable, no es valor quemado de negocio)
  uiPort: rawUiPort || '',

  // Estado de configuración de la API
  isApiConfigured,

  // Modos de compilación de Vite
  isDev: Boolean(import.meta.env.DEV),
  isProd: Boolean(import.meta.env.PROD),
};

export default config;
