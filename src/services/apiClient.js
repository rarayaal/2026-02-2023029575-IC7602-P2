/**
 * Cliente HTTP centralizado para el sistema Zonal Cache & Proxy.
 * Lee la URL base del REST API desde la variable de entorno VITE_API_BASE_URL (mediante config.js).
 * Provee métodos HTTP genéricos (get, post, put, delete) con control de timeout
 * y manejo robusto de errores de conexión sin definir endpoints concretos de negocio.
 */

import { config } from '../utils/config.js';
import { getIdToken } from './firebase.js';

const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Determina si una ruta requiere autenticación de usuario según node-api/README.md.
 * Endpoints públicos: /health, POST /users (registro), /sessions.
 * Endpoints protegidos: /users/me, /domains y sus subrecursos.
 *
 * @param {string} path
 * @param {string} method
 * @returns {boolean}
 */
export function isProtectedPath(path = '', method = 'GET') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const upperMethod = (method || 'GET').toUpperCase();

  // /health es público
  if (cleanPath === '/health' || cleanPath.startsWith('/health/')) {
    return false;
  }

  // POST /users es registro público de cuenta
  if (upperMethod === 'POST' && (cleanPath === '/users' || cleanPath === '/users/')) {
    return false;
  }

  // /sessions es público (autenticación de usuarios finales de cachés)
  if (cleanPath === '/sessions' || cleanPath.startsWith('/sessions/')) {
    return false;
  }

  // Cualquier otra ruta (/domains, /users/me, etc.) requiere autenticación con ID token
  return true;
}

/**
 * Ejecuta una petición HTTP genérica hacia el backend con soporte para Firebase Bearer Token.
 *
 * @param {string} path - Ruta relativa al base URL (ej: '/domains')
 * @param {RequestInit & { requiresAuth?: boolean, _retry?: boolean }} [options={}] - Opciones estándar de fetch
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] - Tiempo máximo de espera en milisegundos
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string|null, isNetworkError: boolean }>}
 */
export async function request(path = '', options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!config.apiBaseUrl || !config.apiBaseUrl.trim()) {
    throw new Error(
      'Error de configuración: La variable de entorno VITE_API_BASE_URL no está configurada. Defina VITE_API_BASE_URL en el archivo .env o en el entorno antes de realizar peticiones.'
    );
  }

  const normalizedBase = config.apiBaseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${normalizedBase}${normalizedPath}`;
  const method = (options.method || 'GET').toUpperCase();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  // Incorporar encabezado Authorization: Bearer <idToken> si la ruta lo requiere
  const shouldAttachAuth =
    options.requiresAuth !== undefined ? Boolean(options.requiresAuth) : isProtectedPath(normalizedPath, method);

  const hasExistingAuthHeader = Boolean(requestHeaders.Authorization || requestHeaders.authorization);

  if (shouldAttachAuth && !hasExistingAuthHeader) {
    try {
      const token = await getIdToken(Boolean(options._retry));
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Si no es posible obtener el token, continúa para que el servidor responda apropiadamente
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: requestHeaders,
    });

    clearTimeout(timeoutId);

    let parsedData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      parsedData = await response.json();
    } else {
      parsedData = await response.text();
    }

    // Manejo de token expirado o 401 con intento de renovación automática (1 intento)
    if (response.status === 401 && !options._retry && shouldAttachAuth) {
      try {
        const refreshedToken = await getIdToken(true);
        if (refreshedToken) {
          return await request(
            path,
            {
              ...options,
              _retry: true,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${refreshedToken}`,
              },
            },
            timeoutMs
          );
        }
      } catch {
        // Falló la renovación, continuar con el reporte de error
      }

      // Notificar al contexto de la aplicación si la sesión ya no es válida
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api:unauthorized', { detail: { path, status: 401 } }));
      }
    }

    if (!response.ok) {
      let errorMessage = null;

      if (parsedData && typeof parsedData === 'object') {
        if (parsedData.error && typeof parsedData.error === 'object' && parsedData.error.message) {
          errorMessage = parsedData.error.message;
        } else if (parsedData.error && typeof parsedData.error === 'string') {
          errorMessage = parsedData.error;
        } else if (parsedData.message && typeof parsedData.message === 'string') {
          errorMessage = parsedData.message;
        }
      }

      if (!errorMessage) {
        if (response.status === 401) {
          errorMessage = 'Sesión no autorizada o expirada. Inicie sesión nuevamente.';
        } else if (response.status === 403) {
          errorMessage = 'Acceso denegado: no tiene permisos para realizar esta operación.';
        } else {
          errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
        }
      }

      return {
        ok: false,
        status: response.status,
        data: parsedData,
        error: errorMessage,
        isNetworkError: false,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsedData,
      error: null,
      isNetworkError: false,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    const isTimeout = err.name === 'AbortError';
    const message = isTimeout
      ? `Tiempo de espera agotado (${timeoutMs / 1000}s) al intentar conectar con ${url}`
      : `Error de red: No fue posible conectar con el servidor en ${url} (${err.message})`;

    return {
      ok: false,
      status: 0,
      data: null,
      error: message,
      isNetworkError: true,
    };
  }
}

/** Métodos HTTP auxiliares genéricos */
export const apiClient = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
  getBaseUrl: () => config.apiBaseUrl,
};

export default apiClient;

