/**
 * Servicio de Sesiones para Cachés Zonales (T-39).
 * 
 * Gestiona el ciclo de vida de las sesiones de usuario final que consumen
 * las URLs protegidas mediante autenticación user_password en los proxies zonales.
 * 
 * Endpoints del backend (node-api/src/routes/sessions.js):
 * - POST /api/sessions: { domain, urlId, username, password } -> { sessionToken, expiresAt }
 * - DELETE /api/sessions: { sessionToken } -> 204 No Content
 * 
 * Flujo Zonal Cache (docs/contrato-cache-api.md §3):
 * 1. Zonal Cache detecta falta de cookie zc_session y redirige a la UI:
 *    AUTH_UI_URL?domain=<dominio>&urlId=<urlId>&redirect=<urlDestino>
 * 2. UI autentica vía createSession(...)
 * 3. UI redirige al navegador hacia:
 *    http://<dominio>/__zc/session?token=<sessionToken>&redirect=<rutaRelativa>
 * 4. Zonal Cache establece la cookie Set-Cookie: zc_session=<sessionToken>; HttpOnly; Path=/
 */

import { request } from './apiClient.js';

const SESSION_STORAGE_KEY = 'zc_active_session';

/**
 * Valida que una cadena no esté vacía ni contenga caracteres peligrosos.
 * @param {string} val 
 * @returns {boolean}
 */
export function isValidIdentifier(val) {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return trimmed.length > 0 && !trimmed.includes('/');
}

/**
 * Sanitiza una ruta de redirección para evitar ataques de redirección abierta (Open Redirect).
 * Solo permite rutas relativas seguras que inicien con '/' y no inicien con '//'.
 * 
 * @param {string} rawRedirect - Ruta o URL recibida en el query parameter
 * @returns {string} - Ruta relativa segura (ej. '/admin/panel' o '/')
 */
export function sanitizeRedirectPath(rawRedirect) {
  if (!rawRedirect || typeof rawRedirect !== 'string') {
    return '/';
  }

  const trimmed = rawRedirect.trim();

  // Si viene una URL absoluta (ej: http://example.com/admin/panel), extraer solo el pathname + search
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = new URL(trimmed);
      const pathname = parsed.pathname || '/';
      return pathname.startsWith('/') ? `${pathname}${parsed.search}` : '/';
    }
  } catch {
    // Si no es URL válida pero empieza con http, descartar por seguridad
    return '/';
  }

  // Prevenir protocolo relativo '//malicious.com'
  if (trimmed.startsWith('//')) {
    return '/';
  }

  // Debe iniciar con '/'
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Fallback seguro
  return `/${trimmed}`;
}

/**
 * Inicia una sesión de caché zonal para un usuario y contraseña en una URL protegida.
 * 
 * @param {Object} params
 * @param {string} params.domain - Nombre de dominio registrado (ej. 'example.com')
 * @param {string} params.urlId - Identificador de la URL (ej. 'u2')
 * @param {string} params.username - Nombre de usuario configurado en la URL
 * @param {string} params.password - Contraseña del usuario
 * @returns {Promise<{ ok: boolean, sessionToken?: string, expiresAt?: string, error?: string, isNetworkError?: boolean }>}
 */
export async function createSession({ domain, urlId, username, password }) {
  // Validación de campos obligatorios en el cliente
  if (!domain || !domain.trim()) {
    return { ok: false, error: 'El dominio es obligatorio.' };
  }
  if (!urlId || !urlId.trim()) {
    return { ok: false, error: 'El identificador de URL (urlId) es obligatorio.' };
  }
  if (!username || !username.trim()) {
    return { ok: false, error: 'El nombre de usuario es obligatorio.' };
  }
  if (!password || !password.trim()) {
    return { ok: false, error: 'La contraseña es obligatoria.' };
  }

  const cleanDomain = domain.trim().toLowerCase();
  const domainForApi = cleanDomain.split(':')[0];
  const cleanUrlId = urlId.trim();
  const cleanUsername = username.trim();

  // Validación de seguridad contra inyección de rutas en Firestore
  if ([domainForApi, cleanUrlId, cleanUsername].some((v) => v.includes('/'))) {
    return { ok: false, error: 'Los identificadores no deben contener barras inclinadas ("/").' };
  }

  let result;
  try {
    result = await request('/sessions', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify({
        domain: domainForApi,
        urlId: cleanUrlId,
        username: cleanUsername,
        password: password,
      }),
    });
  } catch (err) {
    return {
      ok: false,
      error: err.message || 'Error de red al conectar con el servicio de autenticación.',
      isNetworkError: true,
    };
  }

  if (!result.ok) {
    let errorMsg = result.error;
    if (result.status === 401) {
      errorMsg = 'Credenciales no válidas para esta URL protegida.';
    } else if (result.status === 404) {
      errorMsg = 'Dominio o URL no encontrada en la configuración de la caché.';
    } else if (result.isNetworkError) {
      errorMsg = 'No se pudo conectar con el servicio de autenticación. Verifique la conexión.';
    }
    return {
      ok: false,
      error: errorMsg || 'Error al iniciar sesión.',
      isNetworkError: result.isNetworkError,
    };
  }

  const sessionToken = result.data?.sessionToken;
  const expiresAt = result.data?.expiresAt;

  if (!sessionToken) {
    return { ok: false, error: 'Respuesta inválida del servidor: falta token de sesión.' };
  }

  // Guardar metadatos de sesión activa localmente para facilitar visualización y cierre de sesión
  saveLocalSession({
    domain: cleanDomain,
    urlId: cleanUrlId,
    username: cleanUsername,
    sessionToken,
    expiresAt,
  });

  return {
    ok: true,
    sessionToken,
    expiresAt,
  };
}

/**
 * Invalida una sesión en el servidor y limpia el estado local.
 * 
 * @param {string} [tokenToRevoke] - Token específico o null para revocar la sesión activa
 * @returns {Promise<{ ok: boolean, error?: string, isNetworkError?: boolean }>}
 */
export async function deleteSession(tokenToRevoke) {
  const current = getLocalSession();
  const token = tokenToRevoke || current?.sessionToken;

  // Independientemente del resultado del servidor, limpiar sesión local de inmediato
  clearLocalSession();

  if (!token) {
    return { ok: true };
  }

  try {
    const result = await request('/sessions', {
      method: 'DELETE',
      requiresAuth: false,
      body: JSON.stringify({ sessionToken: token }),
    });

    if (!result.ok && !result.isNetworkError) {
      // Si fue error del servidor pero no 204
      return {
        ok: false,
        error: result.error || 'Error al cerrar sesión en el servidor.',
        isNetworkError: false,
      };
    }

    if (result.isNetworkError) {
      return {
        ok: false,
        error: 'Problema de conexión al invalidar la sesión en el servidor. La sesión local fue limpiada.',
        isNetworkError: true,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err.message || 'Error de conexión al invalidar la sesión en el servidor.',
      isNetworkError: true,
    };
  }
}

/**
 * Construye la URL de callback hacia la caché zonal para establecer la cookie HttpOnly.
 * docs/contrato-cache-api.md §3:
 * U->>N: 302 a http://example.com/__zc/session?token=st_...&redirect=/admin/panel
 * 
 * @param {string} domain - Dominio de la caché
 * @param {string} sessionToken - Token generado por el backend
 * @param {string} redirectPath - Ruta relativa de destino
 * @param {string} [scheme='http'] - Esquema (http o https)
 * @returns {string} - URL completa para redirección del navegador
 */
export function buildCacheRedirectUrl(domain, sessionToken, redirectPath, scheme = 'http') {
  let targetAuthority = domain.trim().toLowerCase();
  const safeRedirect = sanitizeRedirectPath(redirectPath);

  // Si redirectPath era una URL absoluta (ej: http://app.local:8080/admin/panel),
  // y el hostname coincide con el dominio, conservar el puerto del proxy
  if (redirectPath && (redirectPath.startsWith('http://') || redirectPath.startsWith('https://'))) {
    try {
      const parsed = new URL(redirectPath);
      const parsedHostNoPort = parsed.hostname.toLowerCase();
      const domainNoPort = targetAuthority.split(':')[0];
      if (parsedHostNoPort === domainNoPort) {
        targetAuthority = parsed.host; // incluye puerto ej. app.local:8080 si venía
        scheme = parsed.protocol.replace(':', '');
      }
    } catch {
      // fallback
    }
  }

  return `${scheme}://${targetAuthority}/__zc/session?token=${encodeURIComponent(sessionToken)}&redirect=${encodeURIComponent(safeRedirect)}`;
}

/**
 * Almacena los metadatos de la sesión activa en sessionStorage.
 * Nunca almacena contraseñas.
 * 
 * @param {Object} data 
 */
export function saveLocalSession(data) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          domain: data.domain,
          urlId: data.urlId,
          username: data.username,
          sessionToken: data.sessionToken,
          expiresAt: data.expiresAt,
          savedAt: new Date().toISOString(),
        })
      );
    }
  } catch {
    // Manejo silencioso en entornos restringidos
  }
}

/**
 * Obtiene la sesión activa almacenada localmente, validando que no haya expirado.
 * @returns {Object|null}
 */
export function getLocalSession() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);

    // Comprobar expiración
    if (session.expiresAt) {
      const expDate = new Date(session.expiresAt);
      if (expDate <= new Date()) {
        clearLocalSession();
        return null;
      }
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Elimina la sesión activa de sessionStorage.
 */
export function clearLocalSession() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Silencioso
  }
}

export default {
  createSession,
  deleteSession,
  buildCacheRedirectUrl,
  sanitizeRedirectPath,
  saveLocalSession,
  getLocalSession,
  clearLocalSession,
};
