/**
 * Endpoints internos que consumen el Zonal Cache y el DNS Interceptor (T-31).
 * Contrato completo en docs/contrato-cache-api.md.
 *
 * Por ahora solo está definida la superficie del contrato; la lógica contra Firestore
 * se implementa en T-31.
 */
import { Router } from 'express';
import { ApiError } from '../middleware/errors.js';
import { requireServiceToken } from '../middleware/serviceAuth.js';

const router = Router();
router.use(requireServiceToken);

const notImplemented = (req, res, next) =>
  next(new ApiError(501, 'NOT_IMPLEMENTED', `${req.method} ${req.originalUrl} is not implemented yet`));

/** Lista de dominios verificados, para el DNS Interceptor. */
router.get('/domains', notImplemented);

/** Configuración completa de un dominio: origen, tamaño de caché y URLs. */
router.get('/domains/:domain/config', notImplemented);

/** Validación de una API key enviada en el encabezado x-api-key. */
router.post('/validate/api-key', notImplemented);

/** Validación de una sesión de usuario y contraseña (cookie zc_session). */
router.post('/validate/session', notImplemented);

export default router;
