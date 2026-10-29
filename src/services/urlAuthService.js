/**
 * Servicio de gestión de autenticación y credenciales por URL (T-38).
 * Administra API Keys (SHA-256, prefix, formato pk_<64 hex>) y usuarios/contraseñas
 * asociados a URLs protegidas según docs/modelo-datos.md secciones 3.4 y 3.5.
 *
 * Dependencia de backend: T-30 (Endpoints de API keys y sesiones, Luis Delgado).
 */

import apiClient from './apiClient.js';

/**
 * Genera una API key criptográficamente segura en claro según docs/modelo-datos.md:
 * "La key en claro tiene la forma pk_<64 caracteres hex> y se muestra una sola vez al crearla."
 *
 * @returns {string} Clave en formato pk_<64 hex chars>
 */
export function generateRawApiKey() {
  const bytes = new Uint8Array(32);
  const cryptoObj = (typeof window !== 'undefined' && window.crypto) || (typeof globalThis !== 'undefined' && globalThis.crypto);

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    throw new Error('Generador criptográfico seguro no disponible (crypto.getRandomValues no encontrado). Por seguridad no se permite el uso de generadores pseudoaleatorios inseguros para credenciales de acceso.');
  }

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `pk_${hex}`;
}

/**
 * Obtiene el prefijo de identificación pública para una API key.
 * Según docs/modelo-datos.md línea 154:
 * "prefix: Primeros 10 caracteres de la key, para identificarla en la UI" (ej: pk_3fa91c2)
 *
 * @param {string} rawKey
 * @returns {string} Prefijo de 10 caracteres
 */
export function getApiKeyPrefix(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  return rawKey.slice(0, 10);
}

/**
 * Calcula el hash SHA-256 en hexadecimal de una cadena (ej. API key o token).
 * Según docs/modelo-datos.md: "El ID es el SHA-256 en hexadecimal de la key."
 *
 * @param {string} text
 * @returns {Promise<string>} Hash SHA-256 de 64 caracteres hexadecimales
 */
export async function hashSha256(text) {
  if (!text || typeof text !== 'string') return '';

  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const subtle = (typeof window !== 'undefined' && window.crypto?.subtle) || globalThis.crypto?.subtle;
  if (subtle && typeof subtle.digest === 'function') {
    const hashBuffer = await subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('La API WebCrypto (crypto.subtle) no está disponible en este entorno. Los navegadores web restringen las funciones criptográficas de SubtleCrypto a contextos seguros (HTTPS o http://localhost). Si accede mediante una dirección IP o nombre de host HTTP sin cifrar, acceda a través de localhost o active HTTPS en su servidor web.');
}

/**
 * Valida el nombre descriptivo de una API Key.
 * @param {string} name
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateApiKeyName(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { valid: false, error: 'El nombre descriptivo de la API key es obligatorio' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'El nombre debe tener al menos 2 caracteres' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: 'El nombre no puede superar los 50 caracteres' };
  }
  return { valid: true, error: null };
}

/**
 * Valida el nombre de usuario de una URL protegida.
 * Según docs/modelo-datos.md sección 3.4: "El ID del documento es el nombre de usuario."
 * @param {string} username
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateUrlUsername(username) {
  if (!username || typeof username !== 'string' || !username.trim()) {
    return { valid: false, error: 'El nombre de usuario es obligatorio' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'El nombre de usuario debe tener al menos 3 caracteres' };
  }
  if (trimmed.length > 30) {
    return { valid: false, error: 'El nombre de usuario no puede superar los 30 caracteres' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return { valid: false, error: 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos' };
  }
  return { valid: true, error: null };
}

/**
 * Valida la contraseña para un usuario de URL protegida.
 * Según docs/modelo-datos.md y node-api/src/lib/validation.js:
 * "Field password must have between 6 and 128 characters"
 *
 * @param {string} password
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateUrlUserPassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'La contraseña es obligatoria' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'La contraseña no puede superar los 128 caracteres' };
  }
  return { valid: true, error: null };
}

/**
 * Extrae mensaje de error uniforme de respuestas del API de credenciales.
 * @param {any} res
 * @returns {{ message: string, code: string|null }}
 */
export function parseUrlAuthApiError(res) {
  if (!res) return { message: 'Error desconocido de comunicación', code: null };

  const data = res.data;
  const errorCode = data?.error?.code || null;
  const serverMsg = data?.error?.message || (typeof data?.error === 'string' ? data.error : data?.message);

  if (res.status === 404 || errorCode === 'NOT_FOUND' || errorCode === 'API_KEY_NOT_FOUND' || errorCode === 'USER_NOT_FOUND') {
    let message = 'La credencial o recurso solicitado no fue encontrado en el servidor.';
    if (errorCode === 'API_KEY_NOT_FOUND') message = 'La API key solicitada no existe para esta URL.';
    if (errorCode === 'USER_NOT_FOUND') message = 'El usuario solicitado no fue encontrado en esta URL.';
    return { message: serverMsg || message, code: errorCode || 'NOT_FOUND' };
  }

  if (res.status === 409 || errorCode === 'API_KEY_ALREADY_EXISTS' || errorCode === 'USER_ALREADY_EXISTS' || errorCode === 'AUTH_TYPE_MISMATCH') {
    let message = 'Ya existe una credencial registrada con este identificador para esta URL.';
    if (errorCode === 'API_KEY_ALREADY_EXISTS') message = 'Ya existe una API key registrada con este hash en la URL.';
    if (errorCode === 'USER_ALREADY_EXISTS') message = 'Ya existe un usuario con este nombre de usuario para esta URL.';
    if (errorCode === 'AUTH_TYPE_MISMATCH') message = 'El mecanismo de autenticación de la URL no coincide con la credencial solicitada.';
    return { message: serverMsg || message, code: errorCode || 'RESOURCE_ALREADY_EXISTS' };
  }

  if (serverMsg) {
    return { message: serverMsg, code: errorCode };
  }

  if (res.error) {
    return { message: res.error, code: null };
  }

  return { message: `Error HTTP ${res.status}`, code: null };
}

/* =========================================================================
 * MÉTODOS DE ADMINISTRACIÓN DE API KEYS (docs/modelo-datos.md sección 3.5)
 * ========================================================================= */

/**
 * Obtiene la lista de API keys asociadas a una URL.
 * Solo devuelve metadatos (name, prefix, createdAt, id); NUNCA la clave en texto plano.
 *
 * @param {string} domainName
 * @param {string} urlId
 * @returns {Promise<{ ok: boolean, status: number, data: any[], error: string|null, code: string|null }>}
 */
export async function getDomainUrlApiKeys(domainName, urlId) {
  try {
    const res = await apiClient.get(
      `/domains/${encodeURIComponent(domainName)}/urls/${encodeURIComponent(urlId)}/api-keys`
    );

    if (!res.ok) {
      const { message, code } = parseUrlAuthApiError(res);
      return { ok: false, status: res.status, data: [], error: message, code };
    }

    const keys = Array.isArray(res.data) ? res.data : (res.data?.apiKeys || []);
    return { ok: true, status: res.status, data: keys, error: null, code: null };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: [],
      error: err.message || 'Error al obtener las API keys',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

/**
 * Crea una nueva API Key para la URL.
 * Genera localmente la clave pk_<64 hex>, calcula el prefijo y su hash SHA-256.
 * Envía el hash al backend y devuelve la clave en claro UNA SOLA VEZ para que la UI la muestre.
 *
 * @param {string} domainName
 * @param {string} urlId
 * @param {string} name
 * @returns {Promise<{ ok: boolean, status: number, data: any, rawKey: string|null, error: string|null, code: string|null }>}
 */
export async function createDomainUrlApiKey(domainName, urlId, name) {
  const validation = validateApiKeyName(name);
  if (!validation.valid) {
    return { ok: false, status: 400, data: null, rawKey: null, error: validation.error, code: 'VALIDATION_ERROR' };
  }

  try {
    const rawKey = generateRawApiKey();
    const prefix = getApiKeyPrefix(rawKey);
    const keyHash = await hashSha256(rawKey);

    const payload = {
      name: name.trim(),
      prefix,
      keyHash,
    };

    const res = await apiClient.post(
      `/domains/${encodeURIComponent(domainName)}/urls/${encodeURIComponent(urlId)}/api-keys`,
      payload
    );

    if (!res.ok) {
      const { message, code } = parseUrlAuthApiError(res);
      return { ok: false, status: res.status, data: null, rawKey: null, error: message, code };
    }

    const returnedData = res.data && typeof res.data === 'object' ? res.data : {};
    return {
      ok: true,
      status: res.status,
      data: {
        id: returnedData.id || keyHash,
        name: name.trim(),
        prefix,
        createdAt: returnedData.createdAt || new Date().toISOString(),
        domain: domainName,
        urlId,
        ...returnedData,
      },
      rawKey, // Clave en claro devuelta ÚNICAMENTE para visualización única en la UI
      error: null,
      code: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      rawKey: null,
      error: err.message || 'Error al crear la API key',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

/**
 * Elimina una API Key por su ID (keyHash).
 *
 * @param {string} domainName
 * @param {string} urlId
 * @param {string} keyId
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string|null, code: string|null }>}
 */
export async function deleteDomainUrlApiKey(domainName, urlId, keyId) {
  try {
    const res = await apiClient.delete(
      `/domains/${encodeURIComponent(domainName)}/urls/${encodeURIComponent(urlId)}/api-keys/${encodeURIComponent(keyId)}`
    );

    if (!res.ok) {
      const { message, code } = parseUrlAuthApiError(res);
      return { ok: false, status: res.status, data: null, error: message, code };
    }

    return { ok: true, status: res.status, data: res.data, error: null, code: null };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Error al eliminar la API key',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

/* =========================================================================
 * MÉTODOS DE ADMINISTRACIÓN DE USUARIOS Y CLAVES (docs/modelo-datos.md sección 3.4)
 * ========================================================================= */

/**
 * Obtiene la lista de usuarios autorizados de una URL protegida.
 * Devuelve únicamente { username, createdAt, updatedAt }; NUNCA expone hashes ni contraseñas.
 *
 * @param {string} domainName
 * @param {string} urlId
 * @returns {Promise<{ ok: boolean, status: number, data: any[], error: string|null, code: string|null }>}
 */
export async function getDomainUrlUsers(domainName, urlId) {
  try {
    const res = await apiClient.get(
      `/domains/${encodeURIComponent(domainName)}/urls/${encodeURIComponent(urlId)}/users`
    );

    if (!res.ok) {
      const { message, code } = parseUrlAuthApiError(res);
      return { ok: false, status: res.status, data: [], error: message, code };
    }

    const users = Array.isArray(res.data) ? res.data : (res.data?.users || []);
    return { ok: true, status: res.status, data: users, error: null, code: null };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: [],
      error: err.message || 'Error al obtener los usuarios de la URL',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

/**
 * Crea un usuario autorizado para una URL protegida.
 * La contraseña se transmite mediante HTTPS al backend para su hasheo bcrypt en Firestore.
 *
 * @param {string} domainName
 * @param {string} urlId
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string|null, code: string|null }>}
 */
export async function createDomainUrlUser(domainName, urlId, username, password) {
  const userVal = validateUrlUsername(username);
  if (!userVal.valid) {
    return { ok: false, status: 400, data: null, error: userVal.error, code: 'VALIDATION_ERROR' };
  }

  const passVal = validateUrlUserPassword(password);
  if (!passVal.valid) {
    return { ok: false, status: 400, data: null, error: passVal.error, code: 'VALIDATION_ERROR' };
  }

  const payload = {
    username: username.trim(),
    password,
  };

  try {
    const res = await apiClient.post(
      `/domains/${encodeURIComponent(domainName)}/urls/${encodeURIComponent(urlId)}/users`,
      payload
    );

    if (!res.ok) {
      const { message, code } = parseUrlAuthApiError(res);
      return { ok: false, status: res.status, data: null, error: message, code };
    }

    const returnedData = res.data && typeof res.data === 'object' ? res.data : {};
    return {
      ok: true,
      status: res.status,
      data: {
        username: username.trim(),
        createdAt: returnedData.createdAt || new Date().toISOString(),
        updatedAt: returnedData.updatedAt || new Date().toISOString(),
        ...returnedData,
      },
      error: null,
      code: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Error al crear el usuario',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

/**
 * Actualiza la contraseña de un usuario autorizado de la URL.
 *
 * @param {string} domainName
 * @param {string} urlId
 * @param {string} username
 * @param {string} newPassword
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string|null, code: string|null }>}
 */
export async function updateDomainUrlUserPassword(domainName, urlId, username, newPassword) {
  const passVal = validateUrlUserPassword(newPassword);
  if (!passVal.valid) {
    return { ok: false, status: 400, data: null, error: passVal.error, code: 'VALIDATION_ERROR' };
  }

  const payload = {
    newPassword,
  };

  try {
    const res = await apiClient.put(
      `/domains/${encodeURIComponent(domainName)}/urls/${encodeURIComponent(urlId)}/users/${encodeURIComponent(username)}/password`,
      payload
    );

    if (!res.ok) {
      const { message, code } = parseUrlAuthApiError(res);
      return { ok: false, status: res.status, data: null, error: message, code };
    }

    return { ok: true, status: res.status, data: res.data, error: null, code: null };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Error al actualizar la contraseña',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

/**
 * Elimina un usuario autorizado de la URL.
 *
 * @param {string} domainName
 * @param {string} urlId
 * @param {string} username
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string|null, code: string|null }>}
 */
export async function deleteDomainUrlUser(domainName, urlId, username) {
  try {
    const res = await apiClient.delete(
      `/domains/${encodeURIComponent(domainName)}/urls/${encodeURIComponent(urlId)}/users/${encodeURIComponent(username)}`
    );

    if (!res.ok) {
      const { message, code } = parseUrlAuthApiError(res);
      return { ok: false, status: res.status, data: null, error: message, code };
    }

    return { ok: true, status: res.status, data: res.data, error: null, code: null };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Error al eliminar el usuario',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

export default {
  generateRawApiKey,
  getApiKeyPrefix,
  hashSha256,
  validateApiKeyName,
  validateUrlUsername,
  validateUrlUserPassword,
  getDomainUrlApiKeys,
  createDomainUrlApiKey,
  deleteDomainUrlApiKey,
  getDomainUrlUsers,
  createDomainUrlUser,
  updateDomainUrlUserPassword,
  deleteDomainUrlUser,
};
