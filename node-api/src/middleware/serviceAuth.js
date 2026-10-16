/**
 * Autenticación servicio a servicio para los endpoints /api/internal/*.
 *
 * El Zonal Cache y el DNS Interceptor envían "Authorization: Bearer <token>", donde el
 * token es un secreto compartido inyectado por la variable INTERNAL_SERVICE_TOKEN.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { requireEnv } from '../config/env.js';
import { ApiError } from './errors.js';

// Se comparan los hashes y no los tokens directamente para que timingSafeEqual reciba
// buffers del mismo largo y la comparación no filtre información por tiempo.
const digest = (value) => createHash('sha256').update(value).digest();

export function requireServiceToken(req, res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'MISSING_SERVICE_TOKEN', 'Bearer service token required'));
  }

  const expected = requireEnv('INTERNAL_SERVICE_TOKEN');
  if (!timingSafeEqual(digest(token), digest(expected))) {
    return next(new ApiError(401, 'INVALID_SERVICE_TOKEN', 'Service token is not valid'));
  }

  return next();
}
