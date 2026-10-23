/**
 * Utilidades compartidas por las rutas que trabajan sobre Firestore.
 */
import { db } from '../config/firebase.js';
import { ApiError } from '../middleware/errors.js';
import { normalizeDomain } from './config.js';

/** Timestamp de Firestore → texto ISO 8601, o null. */
export const toIso = (timestamp) => timestamp?.toDate().toISOString() ?? null;

export const domainRef = (name) => db().collection('domains').doc(normalizeDomain(name));

/**
 * Carga un dominio y comprueba que pertenezca a la persona autenticada.
 * 404 si no existe, 403 si es de otra persona.
 */
export async function loadOwnedDomain(name, uid) {
  const ref = domainRef(name);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new ApiError(404, 'DOMAIN_NOT_FOUND', 'Domain is not registered');
  }
  if (doc.get('ownerUid') !== uid) {
    throw new ApiError(403, 'FORBIDDEN', 'Domain belongs to another user');
  }
  return { ref, doc };
}

/** Carga una URL de un dominio propio. */
export async function loadOwnedUrl(domainName, urlId, uid) {
  const domain = await loadOwnedDomain(domainName, uid);
  const ref = domain.ref.collection('urls').doc(urlId);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new ApiError(404, 'URL_NOT_FOUND', 'URL does not exist in this domain');
  }
  return { domain, ref, doc };
}

/** Exige que la URL use el mecanismo de autenticación indicado. */
export function requireAuthType(urlDoc, type) {
  if (urlDoc.get('auth.type') !== type) {
    throw new ApiError(
      409,
      'AUTH_TYPE_MISMATCH',
      `URL authentication is "${urlDoc.get('auth.type')}", expected "${type}"`,
    );
  }
}

/**
 * Borra los documentos de apiKeys o sessions que coinciden con los filtros.
 * Ej.: deleteWhere('sessions', { domain: 'a.com', urlId: 'u1', username: 'ana' })
 */
export async function deleteWhere(collection, filters) {
  let query = db().collection(collection);
  for (const [field, value] of Object.entries(filters)) {
    query = query.where(field, '==', value);
  }
  const snapshot = await query.get();
  const writer = db().bulkWriter();
  snapshot.docs.forEach((doc) => writer.delete(doc.ref));
  await writer.close();
}

/**
 * Elimina un dominio con todo lo que cuelga de él: URLs y sus usuarios
 * (subcolecciones), y las API keys y sesiones (colecciones raíz).
 */
export async function deleteDomainCascade(ref) {
  await Promise.all([
    deleteWhere('apiKeys', { domain: ref.id }),
    deleteWhere('sessions', { domain: ref.id }),
  ]);
  await db().recursiveDelete(ref);
}

/** Elimina una URL con sus usuarios, API keys y sesiones. */
export async function deleteUrlCascade(domainName, urlRef) {
  await Promise.all([
    deleteWhere('apiKeys', { domain: domainName, urlId: urlRef.id }),
    deleteWhere('sessions', { domain: domainName, urlId: urlRef.id }),
  ]);
  await db().recursiveDelete(urlRef);
}
