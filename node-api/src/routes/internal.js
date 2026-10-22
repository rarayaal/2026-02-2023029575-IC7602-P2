/**
 * Endpoints internos que consumen el Zonal Cache y el DNS Interceptor (T-31).
 * Contrato completo en docs/contrato-cache-api.md.
 */
import { Router } from 'express';
import { db } from '../config/firebase.js';
import { compareBySpecificity, normalizeDomain, toUrlConfig } from '../lib/config.js';
import { sha256Hex } from '../lib/hash.js';
import { ApiError } from '../middleware/errors.js';
import { requireServiceToken } from '../middleware/serviceAuth.js';

const router = Router();
router.use(requireServiceToken);

/** Lee del cuerpo los campos indicados; todos deben ser texto no vacío. */
function requireStrings(body, fields) {
  const values = {};
  for (const field of fields) {
    const value = body?.[field];
    if (typeof value !== 'string' || value === '') {
      throw new ApiError(400, 'INVALID_BODY', `Field "${field}" must be a non-empty string`);
    }
    values[field] = value;
  }
  return values;
}

/** Un secreto (key o sesión) es válido solo para el dominio y la URL a la que pertenece. */
const belongsTo = (data, domain, urlId) =>
  normalizeDomain(data.domain) === normalizeDomain(domain) && data.urlId === urlId;

/** Lista de dominios verificados, para el DNS Interceptor. */
router.get('/domains', async (req, res) => {
  const snapshot = await db()
    .collection('domains')
    .where('verification.status', '==', 'verified')
    .select()
    .get();

  res.json({ domains: snapshot.docs.map((doc) => doc.id).sort() });
});

/** Configuración completa de un dominio: origen, tamaño de caché y URLs. */
router.get('/domains/:domain/config', async (req, res) => {
  const domainRef = db().collection('domains').doc(normalizeDomain(req.params.domain));
  const domainDoc = await domainRef.get();

  if (!domainDoc.exists || domainDoc.get('verification.status') !== 'verified') {
    throw new ApiError(404, 'DOMAIN_NOT_FOUND', 'Domain is not registered or not verified');
  }

  const domain = domainDoc.data();
  const urlsSnapshot = await domainRef.collection('urls').get();
  const urls = urlsSnapshot.docs
    .map((doc) => toUrlConfig(doc.id, doc.data()))
    .sort(compareBySpecificity);

  res.json({
    domain: domainDoc.id,
    origin: {
      scheme: domain.origin.scheme,
      host: domain.origin.host,
      port: domain.origin.port,
    },
    cacheSizeBytes: domain.cacheSizeBytes,
    urls,
  });
});

/** Validación de una API key enviada en el encabezado x-api-key. */
router.post('/validate/api-key', async (req, res) => {
  const { domain, urlId, apiKey } = requireStrings(req.body, ['domain', 'urlId', 'apiKey']);

  const keyDoc = await db().collection('apiKeys').doc(sha256Hex(apiKey)).get();
  res.json({ valid: keyDoc.exists && belongsTo(keyDoc.data(), domain, urlId) });
});

/** Validación de una sesión de usuario y contraseña (cookie zc_session). */
router.post('/validate/session', async (req, res) => {
  const { domain, urlId, sessionToken } = requireStrings(req.body, [
    'domain',
    'urlId',
    'sessionToken',
  ]);

  const sessionDoc = await db().collection('sessions').doc(sha256Hex(sessionToken)).get();
  if (!sessionDoc.exists) return res.json({ valid: false });

  const session = sessionDoc.data();
  const expiresAt = session.expiresAt.toDate();
  if (!belongsTo(session, domain, urlId) || expiresAt <= new Date()) {
    return res.json({ valid: false });
  }

  return res.json({ valid: true, username: session.username, expiresAt: expiresAt.toISOString() });
});

export default router;
