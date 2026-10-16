/**
 * Cliente HTTP centralizado para el sistema Zonal Cache & Proxy.
 * Lee la URL base del REST API desde la variable de entorno VITE_API_BASE_URL (mediante config.js).
 * Provee métodos HTTP genéricos (get, post, put, delete) con control de timeout
 * y manejo robusto de errores de conexión sin definir endpoints concretos de negocio.
 */

import { config } from '../utils/config';

const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Ejecuta una petición HTTP genérica hacia el backend.
 * @param {string} path - Ruta relativa al base URL (ej: '/health' o '/status')
 * @param {RequestInit} [options={}] - Opciones estándar de fetch
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    let parsedData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      parsedData = await response.json();
    } else {
      parsedData = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (parsedData && typeof parsedData === 'object' && (parsedData.message || parsedData.error)) ||
        `Error HTTP ${response.status}: ${response.statusText}`;

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
