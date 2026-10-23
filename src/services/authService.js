/**
 * Servicio de autenticación y registro de cuentas de usuario de la plataforma (T-34).
 * Interactúa con el REST API en Node.js mediante apiClient según docs/modelo-datos.md.
 * 
 * Dependencia de backend: T-27 (Endpoints de usuarios, Luis Delgado).
 */

import apiClient from './apiClient.js';

/**
 * Valida sintácticamente el formato de una dirección de correo electrónico.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // Expresión regular estándar para formato de correo electrónico RFC 5322 básico
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida los requisitos mínimos de la contraseña.
 * Longitud mínima de 6 caracteres (estándar de Firebase Authentication).
 * @param {string} password
 * @returns {{ valid: boolean, message: string|null }}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'La contraseña es obligatoria' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'La contraseña debe contener al menos 6 caracteres' };
  }
  return { valid: true, message: null };
}

/**
 * Valida los campos requeridos para crear una cuenta de usuario.
 * @param {{ displayName: string, email: string, password: string, confirmPassword?: string }} data
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateRegistrationForm({ displayName, email, password, confirmPassword }) {
  const errors = {};

  if (!displayName || !displayName.trim()) {
    errors.displayName = 'El nombre para mostrar es obligatorio';
  } else if (displayName.trim().length < 2) {
    errors.displayName = 'El nombre debe tener al menos 2 caracteres';
  }

  if (!email || !email.trim()) {
    errors.email = 'El correo electrónico es obligatorio';
  } else if (!isValidEmail(email)) {
    errors.email = 'El formato del correo electrónico no es válido (ej. usuario@ejemplo.com)';
  }

  const pwdValidation = validatePassword(password);
  if (!pwdValidation.valid) {
    errors.password = pwdValidation.message;
  }

  if (confirmPassword !== undefined) {
    if (!confirmPassword) {
      errors.confirmPassword = 'Debe confirmar su contraseña';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Extrae un mensaje de error legible del objeto de respuesta devuelto por el API.
 * Compatible con la estructura uniforme { error: { code, message } } del contrato.
 * @param {any} res
 * @returns {{ message: string, code: string|null }}
 */
function parseApiError(res) {
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
      message: 'El endpoint de registro de cuentas (/api/users) no está disponible en el servidor (Tarea T-27 pendiente en el backend).',
      code: 'ENDPOINT_NOT_FOUND',
    };
  }

  if (res.status === 409) {
    return {
      message: 'Ya existe una cuenta registrada con este correo electrónico.',
      code: 'EMAIL_ALREADY_EXISTS',
    };
  }

  if (res.error) {
    return { message: res.error, code: null };
  }

  return { message: `Error HTTP ${res.status}`, code: null };
}

/**
 * Envía la petición de registro de una nueva cuenta de usuario al REST API.
 * @param {{ displayName: string, email: string, password: string }} userData
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string|null, code: string|null }>}
 */
export async function registerAccount({ displayName, email, password }) {
  try {
    const res = await apiClient.post('/users', {
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    if (!res.ok) {
      const { message, code } = parseApiError(res);
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
      error: err.message || 'Error inesperado al conectar con el servidor',
      code: 'CLIENT_EXCEPTION',
    };
  }
}

export default {
  isValidEmail,
  validatePassword,
  validateRegistrationForm,
  registerAccount,
};
