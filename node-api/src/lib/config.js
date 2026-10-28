/**
 * Transformaciones puras entre el modelo de Firestore y las respuestas del contrato
 * con las cachés (docs/contrato-cache-api.md). No dependen de Firebase para poder
 * probarlas de forma aislada.
 */

/** `Example.COM.` → `example.com`. Es el ID del documento en domains/. */
export function normalizeDomain(domain) {
  return String(domain).trim().toLowerCase().replace(/\.$/, '');
}

/** Cantidad de caracteres literales del patrón, sin contar los comodines `*`. */
export function patternSpecificity(pattern) {
  return pattern.replace(/\*/g, '').length;
}

/**
 * Ordena de más a menos específico, para que la caché use la primera coincidencia.
 * En empate gana el patrón con menos comodines y, por último, el orden alfabético,
 * para que la respuesta sea siempre la misma.
 */
export function compareBySpecificity(a, b) {
  const wildcards = (p) => (p.match(/\*/g) ?? []).length;
  return (
    patternSpecificity(b.pattern) - patternSpecificity(a.pattern) ||
    wildcards(a.pattern) - wildcards(b.pattern) ||
    a.pattern.localeCompare(b.pattern)
  );
}

/**
 * En Firestore fileTypes es un mapa { ext: { ttlSeconds, policy } }; el contrato lo
 * entrega como arreglo porque es más simple de recorrer desde C. El valor por
 * defecto `*` va al final.
 */
export function fileTypesToArray(fileTypes = {}) {
  return Object.entries(fileTypes)
    .map(([extension, { ttlSeconds, policy }]) => ({ extension, ttlSeconds, policy }))
    .sort((a, b) => {
      if (a.extension === '*') return 1;
      if (b.extension === '*') return -1;
      return a.extension.localeCompare(b.extension);
    });
}

/** Documento de domains/{d}/urls/{id} → elemento de `urls` en la respuesta. */
export function toUrlConfig(id, data) {
  return {
    id,
    pattern: data.pattern,
    cacheSizeBytes: data.cacheSizeBytes,
    auth: { type: data.auth?.type ?? 'none' },
    fileTypes: fileTypesToArray(data.fileTypes),
  };
}
