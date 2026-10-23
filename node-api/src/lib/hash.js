import { createHash } from 'node:crypto';

/**
 * SHA-256 en hexadecimal. Es el ID de los documentos de apiKeys y sessions:
 * el secreto en claro nunca se guarda en Firestore (ver docs/modelo-datos.md).
 */
export const sha256Hex = (value) => createHash('sha256').update(value).digest('hex');
