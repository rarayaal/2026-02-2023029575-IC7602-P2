/**
 * Servicio de administración de URLs asociadas a dominios (T-36).
 * Reglas de comodines (wildcards), especificidad y jerarquía según docs/modelo-datos.md sección 3.3.
 * 
 * Dependencia de backend: T-29 (Endpoints de URLs y caché, Luis Delgado).
 */

import apiClient from './apiClient.js';

/**
 * Valida la sintaxis de un patrón de URL con soporte para wildcards (*).
 * Según docs/modelo-datos.md:
 * - Debe comenzar obligatoriamente con '/'.
 * - No puede contener espacios ni caracteres de control.
 * - El comodín '*' puede ubicarse en cualquier posición (ej: '/', '/images/*', '/*.css', '/*').
 * 
 * @param {string} pattern
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateUrlPattern(pattern) {
  if (!pattern || typeof pattern !== 'string' || !pattern.trim()) {
    return { valid: false, error: 'El patrón de URL es obligatorio' };
  }

  const trimmed = pattern.trim();

  if (!trimmed.startsWith('/')) {
    return { valid: false, error: 'El patrón debe comenzar obligatoriamente con una barra inclinada (/)' };
  }

  if (/\s/.test(trimmed)) {
    return { valid: false, error: 'El patrón de URL no puede contener espacios en blanco' };
  }

  if (trimmed.includes('//')) {
    return { valid: false, error: 'El patrón no puede contener barras dobles consecutivas (//)' };
  }

  if (trimmed.includes('?')) {
    return { valid: false, error: 'El patrón de ruta no debe incluir parámetros de consulta (?)' };
  }

  if (trimmed.includes('#')) {
    return { valid: false, error: 'El patrón de ruta no debe incluir fragmentos (#)' };
  }

  return { valid: true, error: null };
}

/**
 * Calcula la especificidad de un patrón de URL según la regla de docs/modelo-datos.md:
 * "gana el más específico: el que tiene más caracteres literales (sin contar '*')".
 * 
 * @param {string} pattern
 * @returns {number} Número de caracteres literales (excluyendo '*')
 */
export function calculatePatternSpecificity(pattern) {
  if (!pattern || typeof pattern !== 'string') return 0;
  return pattern.replace(/\*/g, '').length;
}

/**
 * Valida todos los campos del formulario de creación/edición de una URL.
 * 
 * @param {{ pattern: string, cacheSizeBytes: number|string, authType: string }} data
 * @param {number} [domainMaxBytes=null] - Límite de caché del dominio padre para validación
 * @param {number} [currentAllocatedBytes=0] - Bytes ya asignados a otras URLs
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateUrlForm(data, domainMaxBytes = null, currentAllocatedBytes = 0) {
  const errors = {};

  // 1. Patrón de URL
  const patternValidation = validateUrlPattern(data.pattern);
  if (!patternValidation.valid) {
    errors.pattern = patternValidation.error;
  }

  // 2. Tamaño de caché
  const cacheBytes = Number(data.cacheSizeBytes);
  if (data.cacheSizeBytes === undefined || data.cacheSizeBytes === '' || isNaN(cacheBytes)) {
    errors.cacheSizeBytes = 'El tamaño de caché para esta URL es obligatorio';
  } else if (!Number.isInteger(cacheBytes) || cacheBytes <= 0) {
    errors.cacheSizeBytes = 'El tamaño de caché debe ser un número entero positivo en bytes';
  } else if (domainMaxBytes && (cacheBytes + currentAllocatedBytes) > domainMaxBytes) {
    errors.cacheSizeBytes = `La suma de tamaños de caché supera el límite del dominio (${(domainMaxBytes / (1024 * 1024)).toFixed(1)} MB)`;
  }

  // 3. Tipo de autenticación
  const allowedAuthTypes = ['none', 'api_key', 'user_password'];
  if (!data.authType || !allowedAuthTypes.includes(data.authType)) {
    errors.authType = 'El tipo de autenticación debe ser: none (pública), api_key o user_password';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Extrae mensaje de error uniforme de respuestas del API de URLs.
 * @param {any} res
 * @returns {{ message: string, code: string|null }}
 */
function parseUrlApiError(res) {
  if (!res) return { message: 'Error desconocido de comunicación', code: null };

  const data = res.data;
  if (data && typeof data === 'object') {
    if (data.error && typeof data.error === 'object') {
      return {
        message: data.error.message || `Error del servidor (${data.error.code || res.status})`,
        code: data.error.code || null,
      };
    }
    if (data.error && typeof data.error === 'string') {
      return { message: data.error, code: null };
    }
    if (data.message && typeof data.message === 'string') {
      return { message: data.message, code: null };
    }
  }

  if (res.status === 404) {
    return {
      message: 'El endpoint de URLs (/api/domains/:domain/urls) no está disponible en el servidor (Tarea T-29 pendiente en el backend).',
      code: 'ENDPOINT_NOT_FOUND',
    };
  }

  if (res.status === 409) {
    return {
      message: 'Ya existe una URL configurada con este mismo patrón en el dominio.',
      code: 'PATTERN_ALREADY_EXISTS',
    };
  }

  if (res.error) {
    return { message: res.error, code: null };
  }

  return { message: `Error HTTP ${res.status}`, code: null };
}

/**
 * Obtiene la lista de URLs configuradas para un dominio.
 * @param {string} domainName
 * @returns {Promise<{ ok: boolean, status: number, data: any[], error: string|null, code: string|null }>}
 */
export async function getDomainUrls(domainName) {
  try {
    const res = await apiClient.get(`/domains/${encodeURIComponent(domainName)}/urls`);

    if (!res.ok) {
      const { message, code } = parseUrlApiError(res);
      return {
        ok: false,
        status: res.status,
        data: [],
        error: message,
        code,
      };
    }

    const urls = Array.isArray(res.data) ? res.data : (res.data?.urls || []);
    return {
      ok: true,
      status: res.status,
      data: urls,
      error: null,
      code: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: [],
      error: err.message || 'Error al obtener las URLs del dominio',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

/**
 * Crea una nueva URL dentro de un dominio.
 * @param {string} domainName
 * @param {{ pattern: string, cacheSizeBytes: number, authType: string }} urlData
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string|null, code: string|null }>}
 */
export async function createDomainUrl(domainName, urlData) {
  const payload = {
    pattern: urlData.pattern.trim(),
    cacheSizeBytes: Number(urlData.cacheSizeBytes),
    auth: {
      type: urlData.authType,
    },
  };

  try {
    const res = await apiClient.post(`/domains/${encodeURIComponent(domainName)}/urls`, payload);

    if (!res.ok) {
      const { message, code } = parseUrlApiError(res);
      return {
        ok: false,
        status: res.status,
        data: res.data,
        error: message,
        code,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: res.data,
      error: null,
      code: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Error al crear la URL',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

/**
 * Modifica una URL existente dentro de un dominio.
 * @param {string} domainName
 * @param {string} urlId
 * @param {{ pattern: string, cacheSizeBytes: number, authType: string }} urlData
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string|null, code: string|null }>}
 */
export async function updateDomainUrl(domainName, urlId, urlData) {
  const payload = {
    pattern: urlData.pattern.trim(),
    cacheSizeBytes: Number(urlData.cacheSizeBytes),
    auth: {
      type: urlData.authType,
    },
  };

  try {
    const res = await apiClient.put(
      `/domains/${encodeURIComponent(domainName)}/urls/${encodeURIComponent(urlId)}`,
      payload
    );

    if (!res.ok) {
      const { message, code } = parseUrlApiError(res);
      return {
        ok: false,
        status: res.status,
        data: res.data,
        error: message,
        code,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: res.data,
      error: null,
      code: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Error al modificar la URL',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

/**
 * Elimina una URL de un dominio.
 * @param {string} domainName
 * @param {string} urlId
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string|null, code: string|null }>}
 */
export async function deleteDomainUrl(domainName, urlId) {
  try {
    const res = await apiClient.delete(
      `/domains/${encodeURIComponent(domainName)}/urls/${encodeURIComponent(urlId)}`
    );

    if (!res.ok) {
      const { message, code } = parseUrlApiError(res);
      return {
        ok: false,
        status: res.status,
        data: res.data,
        error: message,
        code,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: res.data,
      error: null,
      code: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Error al eliminar la URL',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

export default {
  validateUrlPattern,
  calculatePatternSpecificity,
  validateUrlForm,
  getDomainUrls,
  createDomainUrl,
  updateDomainUrl,
  deleteDomainUrl,
};
