/**
 * Lectura centralizada de variables de entorno.
 *
 * Ningún valor de configuración se quema en el código: todo llega por el entorno
 * (archivo .env en local, Environment Variables del proyecto en Vercel).
 */

/** Devuelve la variable o lanza un error claro si no está definida. */
export function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Devuelve la variable como entero, o el valor por defecto si no está definida. */
export function intEnv(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be an integer, got "${raw}"`);
  }
  return value;
}

/** Puerto del servidor local. En Vercel no se usa. */
export const port = () => intEnv('PORT', 3000);
