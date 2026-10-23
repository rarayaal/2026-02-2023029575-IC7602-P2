/**
 * Validación de los cuerpos de las peticiones de la UI. Funciones puras que lanzan
 * ApiError(400) con un código específico, para que la UI pueda mostrar el motivo.
 */
import { ApiError } from '../middleware/errors.js';
import { normalizeDomain } from './config.js';

export const POLICIES = ['LRU', 'LFU', 'FIFO', 'MRU', 'RANDOM'];
export const AUTH_TYPES = ['none', 'api_key', 'user_password'];

const invalid = (code, message) => new ApiError(400, code, message);

const isPositiveInt = (value) => Number.isSafeInteger(value) && value > 0;

/** Texto no vacío, recortado. */
export function requireString(value, field, { max = 200 } = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalid('INVALID_BODY', `Field "${field}" must be a non-empty string`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw invalid('INVALID_BODY', `Field "${field}" must have at most ${max} characters`);
  }
  return trimmed;
}

// Etiquetas de 1 a 63 caracteres, alfanuméricas con guiones internos, y al menos dos.
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function validateDomainName(value) {
  const name = normalizeDomain(requireString(value, 'name', { max: 253 }));
  if (!DOMAIN_RE.test(name)) {
    throw invalid('INVALID_DOMAIN', `"${name}" is not a valid domain name`);
  }
  return name;
}

export function validateOrigin(origin) {
  if (!origin || typeof origin !== 'object') {
    throw invalid('INVALID_ORIGIN', 'Field "origin" must be an object with scheme, host and port');
  }
  if (!['http', 'https'].includes(origin.scheme)) {
    throw invalid('INVALID_ORIGIN', 'origin.scheme must be "http" or "https"');
  }
  const host = requireString(origin.host, 'origin.host', { max: 253 });
  if (/[\s/:]/.test(host)) {
    throw invalid('INVALID_ORIGIN', 'origin.host must be a host name or IP, without scheme, port or path');
  }
  if (!Number.isInteger(origin.port) || origin.port < 1 || origin.port > 65535) {
    throw invalid('INVALID_ORIGIN', 'origin.port must be an integer between 1 and 65535');
  }
  return { scheme: origin.scheme, host, port: origin.port };
}

export function validateCacheSize(value, field = 'cacheSizeBytes') {
  if (!isPositiveInt(value)) {
    throw invalid('INVALID_CACHE_SIZE', `Field "${field}" must be a positive integer (bytes)`);
  }
  return value;
}

/** Patrón de ruta: empieza con "/", sin espacios, sin query string ni fragmento. */
export function validatePattern(value) {
  const pattern = requireString(value, 'pattern', { max: 500 });
  if (!pattern.startsWith('/') || /[\s?#]/.test(pattern)) {
    throw invalid(
      'INVALID_PATTERN',
      'pattern must start with "/" and cannot contain spaces, "?" or "#"',
    );
  }
  return pattern;
}

export function validateAuth(auth) {
  const type = auth?.type;
  if (!AUTH_TYPES.includes(type)) {
    throw invalid('INVALID_AUTH_TYPE', `auth.type must be one of: ${AUTH_TYPES.join(', ')}`);
  }
  return { type };
}

/** Mapa { extensión: { ttlSeconds, policy } }; la llave "*" es el valor por defecto. */
export function validateFileTypes(fileTypes = {}) {
  if (typeof fileTypes !== 'object' || fileTypes === null || Array.isArray(fileTypes)) {
    throw invalid('INVALID_FILE_TYPES', 'fileTypes must be an object keyed by extension');
  }
  const result = {};
  for (const [rawExtension, config] of Object.entries(fileTypes)) {
    const extension = rawExtension.trim().toLowerCase().replace(/^\./, '');
    if (extension !== '*' && !/^[a-z0-9]{1,10}$/.test(extension)) {
      throw invalid('INVALID_FILE_TYPES', `"${rawExtension}" is not a valid file extension`);
    }
    if (!isPositiveInt(config?.ttlSeconds)) {
      throw invalid('INVALID_FILE_TYPES', `fileTypes.${extension}.ttlSeconds must be a positive integer`);
    }
    if (!POLICIES.includes(config?.policy)) {
      throw invalid(
        'INVALID_FILE_TYPES',
        `fileTypes.${extension}.policy must be one of: ${POLICIES.join(', ')}`,
      );
    }
    result[extension] = { ttlSeconds: config.ttlSeconds, policy: config.policy };
  }
  return result;
}

/** Cuerpo completo de una URL (crear o modificar). */
export function validateUrlBody(body) {
  return {
    pattern: validatePattern(body?.pattern),
    cacheSizeBytes: validateCacheSize(body?.cacheSizeBytes),
    auth: validateAuth(body?.auth),
    fileTypes: validateFileTypes(body?.fileTypes),
  };
}

export function validateUsername(value) {
  const username = requireString(value, 'username', { max: 30 });
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
    throw invalid(
      'INVALID_USERNAME',
      'username must have 3 to 30 letters, numbers, dots, hyphens or underscores',
    );
  }
  return username;
}

export function validatePassword(value, field = 'password') {
  if (typeof value !== 'string' || value.length < 6 || value.length > 128) {
    throw invalid('INVALID_PASSWORD', `Field "${field}" must have between 6 and 128 characters`);
  }
  return value;
}

export function validateEmail(value) {
  const email = requireString(value, 'email', { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw invalid('INVALID_EMAIL', 'email is not valid');
  }
  return email;
}

/**
 * La UI genera la key en el navegador y envía solo su hash y su prefijo, de modo que
 * la key en claro nunca viaja al servidor.
 */
export function validateApiKeyBody(body) {
  const name = requireString(body?.name, 'name', { max: 50 });
  if (typeof body?.keyHash !== 'string' || !/^[0-9a-f]{64}$/.test(body.keyHash)) {
    throw invalid('INVALID_API_KEY', 'keyHash must be the SHA-256 of the key in lowercase hex');
  }
  if (typeof body?.prefix !== 'string' || !/^pk_[0-9a-f]{7}$/.test(body.prefix)) {
    throw invalid('INVALID_API_KEY', 'prefix must be the first 10 characters of the key (pk_ + 7 hex)');
  }
  return { name, keyHash: body.keyHash, prefix: body.prefix };
}
