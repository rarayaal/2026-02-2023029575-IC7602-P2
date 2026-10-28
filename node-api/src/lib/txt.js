/**
 * Verificación de propiedad de un dominio mediante un registro DNS TXT
 * (docs/modelo-datos.md, sección 3.2).
 */
import { randomBytes } from 'node:crypto';
import { resolveTxt } from 'node:dns/promises';

export const TXT_PREFIX = '_proxycache-verify';
export const TXT_VALUE_PREFIX = 'proxycache-verification=';

export const newVerificationToken = () => randomBytes(16).toString('hex');

/** Registro que la persona debe publicar en su DNS. */
export function txtRecordFor(domain, token) {
  return { name: `${TXT_PREFIX}.${domain}`, type: 'TXT', value: `${TXT_VALUE_PREFIX}${token}` };
}

/**
 * resolveTxt devuelve cada registro partido en fragmentos de hasta 255 bytes;
 * se unen antes de comparar.
 */
export function txtRecordsMatch(records, token) {
  const expected = `${TXT_VALUE_PREFIX}${token}`;
  return records.some((chunks) => chunks.join('').trim() === expected);
}

/** Consulta el DNS. Si el registro no existe devuelve false en lugar de fallar. */
export async function isDomainVerified(domain, token, resolver = resolveTxt) {
  try {
    const records = await resolver(`${TXT_PREFIX}.${domain}`);
    return txtRecordsMatch(records, token);
  } catch (err) {
    if (['ENOTFOUND', 'ENODATA', 'NXDOMAIN', 'ESERVFAIL'].includes(err.code)) return false;
    throw err;
  }
}
