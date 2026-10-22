/**
 * Servicio de gestión y validación de dominios y registros DNS TXT (T-34).
 * Estructurado conforme al modelo de datos oficial en docs/modelo-datos.md.
 * 
 * Dependencia de backend: T-28 (Endpoints de dominios y verificación TXT, Luis Delgado).
 */

import apiClient from './apiClient.js';

/**
 * Normaliza un nombre de dominio siguiendo las reglas del proyecto:
 * En minúsculas, sin espacios, sin esquemas (http/https), sin rutas y sin punto final.
 * @param {string} rawDomain
 * @returns {string}
 */
export function normalizeDomain(rawDomain) {
  if (!rawDomain || typeof rawDomain !== 'string') return '';

  let normalized = rawDomain.trim().toLowerCase();

  // Eliminar protocolo si fue introducido accidentalmente
  normalized = normalized.replace(/^https?:\/\//i, '');

  // Eliminar cualquier ruta, query string o fragmento
  normalized = normalized.split('/')[0].split('?')[0].split('#')[0];

  // Eliminar puerto si fue introducido en el nombre de dominio
  normalized = normalized.split(':')[0];

  // Eliminar puntos finales
  normalized = normalized.replace(/\.+$/, '');

  return normalized;
}

/**
 * Valida la sintaxis de un nombre de dominio (FQDN según RFC 1035).
 * @param {string} domain
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateDomainSyntax(domain) {
  if (!domain || typeof domain !== 'string' || !domain.trim()) {
    return { valid: false, error: 'El nombre de dominio es obligatorio' };
  }

  const normalized = normalizeDomain(domain);

  // Comprobar si contenía protocolo o rutas originalmente
  if (domain.includes('://')) {
    return { valid: false, error: 'Introduzca únicamente el dominio sin protocolo (sin http:// o https://)' };
  }
  if (domain.includes('/') || domain.includes('\\')) {
    return { valid: false, error: 'Introduzca únicamente el dominio sin rutas ni barras inclinadas' };
  }
  if (domain.includes(':')) {
    return { valid: false, error: 'El puerto no forma parte del dominio. Especifíquelo en la sección de origen' };
  }

  if (normalized.length > 253) {
    return { valid: false, error: 'El dominio supera la longitud máxima permitida de 253 caracteres' };
  }

  // Debe contener al menos un punto (ej: example.com)
  if (!normalized.includes('.')) {
    return { valid: false, error: 'El dominio debe incluir una extensión válida (ej. dominio.com)' };
  }

  // Validación de etiquetas del FQDN
  const labels = normalized.split('.');
  if (labels.length < 2) {
    return { valid: false, error: 'El dominio debe tener al menos un nombre y un TLD' };
  }

  const labelRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  for (const label of labels) {
    if (label.length === 0) {
      return { valid: false, error: 'El dominio no puede contener etiquetas vacías o puntos consecutivos' };
    }
    if (label.length > 63) {
      return { valid: false, error: `La etiqueta "${label}" supera los 63 caracteres permitidos` };
    }
    if (!labelRegex.test(label)) {
      return { valid: false, error: `La etiqueta "${label}" contiene caracteres no válidos (solo letras, números y guiones)` };
    }
  }

  // El TLD debe ser alfabético y de al menos 2 letras
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/.test(tld)) {
    return { valid: false, error: 'La extensión de dominio (TLD) debe contener al menos 2 letras' };
  }

  return { valid: true, error: null };
}

/**
 * Valida todos los campos del formulario de registro de dominio.
 * @param {{ name: string, originScheme: string, originHost: string, originPort: number|string, cacheSizeBytes: number|string }} data
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateDomainForm(data) {
  const errors = {};

  // 1. Dominio
  const domainSyntax = validateDomainSyntax(data.name);
  if (!domainSyntax.valid) {
    errors.name = domainSyntax.error;
  }

  // 2. Esquema de origen
  if (!data.originScheme || !['http', 'https'].includes(data.originScheme)) {
    errors.originScheme = 'El esquema de origen debe ser http o https';
  }

  // 3. Host de origen
  if (!data.originHost || !data.originHost.trim()) {
    errors.originHost = 'El host o IP del servidor de origen es obligatorio';
  } else {
    const hostClean = data.originHost.trim();
    if (hostClean.includes('://')) {
      errors.originHost = 'El host de origen no debe incluir http:// o https://';
    }
    if (hostClean.includes('/') || hostClean.includes('?')) {
      errors.originHost = 'El host de origen no debe incluir rutas ni parámetros';
    }
  }

  // 4. Puerto de origen
  const portNum = Number(data.originPort);
  if (!data.originPort || isNaN(portNum) || !Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    errors.originPort = 'El puerto debe ser un número entero entre 1 y 65535';
  }

  // 5. Tamaño de caché (en bytes)
  const cacheBytes = Number(data.cacheSizeBytes);
  if (!data.cacheSizeBytes || isNaN(cacheBytes) || cacheBytes <= 0 || !Number.isInteger(cacheBytes)) {
    errors.cacheSizeBytes = 'El tamaño de caché debe ser un número entero positivo en bytes';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Devuelve la especificación del registro DNS TXT exigido para verificar la propiedad del dominio.
 * Según docs/modelo-datos.md líneas 75-86.
 * @param {string} domainName
 * @param {string} token
 * @returns {{ recordHost: string, recordType: string, recordValue: string }}
 */
export function getDnsTxtSpec(domainName, token) {
  const normalized = normalizeDomain(domainName);
  return {
    recordHost: `_proxycache-verify.${normalized}`,
    recordType: 'TXT',
    recordValue: `proxycache-verification=${token}`,
  };
}

/**
 * Extrae mensaje de error uniforme de respuestas del API de dominios.
 * @param {any} res
 * @returns {{ message: string, code: string|null }}
 */
function parseDomainApiError(res) {
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
      message: 'El endpoint de dominios (/api/domains) no está disponible en el servidor (Tarea T-28 pendiente en el backend).',
      code: 'ENDPOINT_NOT_FOUND',
    };
  }

  if (res.status === 409) {
    return {
      message: 'Este dominio ya se encuentra registrado en el sistema. Los dominios son identificadores únicos.',
      code: 'DOMAIN_ALREADY_EXISTS',
    };
  }

  if (res.error) {
    return { message: res.error, code: null };
  }

  return { message: `Error HTTP ${res.status}`, code: null };
}

/**
 * Registra un nuevo dominio en el REST API.
 * El backend genera el verification.token y establece verification.status = 'pending'.
 * @param {{ name: string, originScheme: string, originHost: string, originPort: number, cacheSizeBytes: number }} formData
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string|null, code: string|null }>}
 */
export async function registerDomain(formData) {
  const normalizedName = normalizeDomain(formData.name);

  const payload = {
    name: normalizedName,
    origin: {
      scheme: formData.originScheme,
      host: formData.originHost.trim(),
      port: Number(formData.originPort),
    },
    cacheSizeBytes: Number(formData.cacheSizeBytes),
  };

  try {
    const res = await apiClient.post('/domains', payload);

    if (!res.ok) {
      const { message, code } = parseDomainApiError(res);
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
      error: err.message || 'Error inesperado al intentar registrar el dominio',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

/**
 * Solicita al REST API la comprobación del registro DNS TXT para verificar la propiedad del dominio.
 * @param {string} domainName
 * @returns {Promise<{ ok: boolean, status: number, data: any, verified: boolean, error: string|null, code: string|null }>}
 */
export async function requestDomainTxtVerification(domainName) {
  const normalizedName = normalizeDomain(domainName);

  try {
    const res = await apiClient.post(`/domains/${encodeURIComponent(normalizedName)}/verify`);

    if (!res.ok) {
      const { message, code } = parseDomainApiError(res);
      return {
        ok: false,
        status: res.status,
        data: res.data,
        verified: false,
        error: message,
        code,
      };
    }

    // La respuesta esperada del backend al verificar exitosamente
    const isVerified = Boolean(
      res.data && 
      (res.data.status === 'verified' || res.data.verified === true || res.data.verification?.status === 'verified')
    );

    return {
      ok: true,
      status: res.status,
      data: res.data,
      verified: isVerified,
      error: null,
      code: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      verified: false,
      error: err.message || 'Error al conectar con el servicio de verificación',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

export default {
  normalizeDomain,
  validateDomainSyntax,
  validateDomainForm,
  getDnsTxtSpec,
  registerDomain,
  requestDomainTxtVerification,
};
