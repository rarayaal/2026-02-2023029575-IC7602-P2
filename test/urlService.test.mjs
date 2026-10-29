/**
 * Pruebas unitarias para T-36 y T-37: urlService.js
 * Reglas de comodines (wildcards), especificidad, tipos de archivo y control de cuota de caché.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateUrlPattern,
  calculatePatternSpecificity,
  validateFileTypeEntry,
  validateAllFileTypes,
  validateUrlForm,
  ALLOWED_CACHE_POLICIES,
  parseUrlApiError,
} from '../src/services/urlService.js';

test('T-36: 1. Validación de patrones de URL con wildcards (*)', () => {
  // Patrones válidos
  assert.equal(validateUrlPattern('/').valid, true);
  assert.equal(validateUrlPattern('/*').valid, true);
  assert.equal(validateUrlPattern('/images/*').valid, true);
  assert.equal(validateUrlPattern('/*.css').valid, true);
  assert.equal(validateUrlPattern('/api/v1/*').valid, true);
  assert.equal(validateUrlPattern('/admin/panel').valid, true);

  // Patrones inválidos
  assert.equal(validateUrlPattern('').valid, false);
  assert.equal(validateUrlPattern('   ').valid, false);
  assert.equal(validateUrlPattern(null).valid, false);
  assert.equal(validateUrlPattern(undefined).valid, false);

  // Debe comenzar con /
  const noSlash = validateUrlPattern('images/*');
  assert.equal(noSlash.valid, false);
  assert.match(noSlash.error, /barra inclinada/i);

  // No debe contener espacios en blanco
  const withSpaces = validateUrlPattern('/admin panel/*');
  assert.equal(withSpaces.valid, false);
  assert.match(withSpaces.error, /espacios en blanco/i);

  // No debe contener barras dobles consecutivas
  const doubleSlash = validateUrlPattern('/images//logo.png');
  assert.equal(doubleSlash.valid, false);
  assert.match(doubleSlash.error, /barras dobles/i);

  // No debe contener query string (?) ni fragmento (#)
  const withQuery = validateUrlPattern('/index.html?param=1');
  assert.equal(withQuery.valid, false);
  const withHash = validateUrlPattern('/page#section');
  assert.equal(withHash.valid, false);
});

test('T-36: 2. Cálculo de especificidad de patrones comodín según docs/modelo-datos.md', () => {
  // "Gana el más específico: el que tiene más caracteres literales (sin contar '*')"
  const specCatchAll = calculatePatternSpecificity('/*');
  const specImages = calculatePatternSpecificity('/images/*');
  const specCss = calculatePatternSpecificity('/*.css');
  const specRoot = calculatePatternSpecificity('/');

  // /* tiene 1 caracter literal ('/')
  assert.equal(specCatchAll, 1);
  // /images/* tiene 8 caracteres literales ('/images/')
  assert.equal(specImages, 8);
  // /*.css tiene 5 caracteres literales ('/.css')
  assert.equal(specCss, 5);
  // / tiene 1 caracter literal ('/')
  assert.equal(specRoot, 1);

  // Comprobación de jerarquía y orden de matching:
  // /images/* (8) > /*.css (5) > /* (1)
  assert.ok(specImages > specCss);
  assert.ok(specCss > specCatchAll);
  assert.equal(calculatePatternSpecificity(null), 0);
});

test('T-37: 3. Validación de configuración de tipos de archivo (fileTypes, TTL y política)', () => {
  // Entradas válidas
  const validHtml = validateFileTypeEntry('html', { ttlSeconds: 60, policy: 'LRU' });
  assert.equal(validHtml.valid, true);
  assert.equal(validHtml.cleanExt, 'html');
  assert.equal(validHtml.config.ttlSeconds, 60);
  assert.equal(validHtml.config.policy, 'LRU');

  const validWildcard = validateFileTypeEntry('*', { ttlSeconds: 300, policy: 'RANDOM' });
  assert.equal(validWildcard.valid, true);
  assert.equal(validWildcard.cleanExt, '*');
  assert.equal(validWildcard.config.policy, 'RANDOM');

  const validDotExt = validateFileTypeEntry('.css', { ttlSeconds: 3600, policy: 'LFU' });
  assert.equal(validDotExt.valid, true);
  assert.equal(validDotExt.cleanExt, 'css');

  // Políticas permitidas
  for (const pol of ALLOWED_CACHE_POLICIES) {
    const res = validateFileTypeEntry('png', { ttlSeconds: 100, policy: pol });
    assert.equal(res.valid, true);
  }

  // Política no soportada
  const invalidPolicy = validateFileTypeEntry('js', { ttlSeconds: 100, policy: 'INVALID_POLICY' });
  assert.equal(invalidPolicy.valid, false);
  assert.match(invalidPolicy.error, /política de reemplazo/i);

  // TTL cero, negativo o inválido (debe ser entero > 0)
  const zeroTtl = validateFileTypeEntry('js', { ttlSeconds: 0, policy: 'LRU' });
  assert.equal(zeroTtl.valid, false);
  const negTtl = validateFileTypeEntry('js', { ttlSeconds: -10, policy: 'LRU' });
  assert.equal(negTtl.valid, false);
  const nanTtl = validateFileTypeEntry('js', { ttlSeconds: 'abc', policy: 'LRU' });
  assert.equal(nanTtl.valid, false);

  // Extensión inválida
  const invalidExt = validateFileTypeEntry('html/xml', { ttlSeconds: 60, policy: 'LRU' });
  assert.equal(invalidExt.valid, false);
});

test('T-36/T-37: 4. Validación integral de formulario de URL y cumplimiento de cuota de caché del dominio', () => {
  const domainLimit = 104857600; // 100 MB límite del dominio
  const existingOtherUrlsAllocated = 52428800; // 50 MB usados por otras URLs

  // Formulario correcto dentro de cuota (pide 30 MB; 50 + 30 = 80 MB <= 100 MB)
  const validForm = validateUrlForm(
    {
      pattern: '/api/*',
      cacheSizeBytes: 31457280, // 30 MB
      authType: 'api_key',
      fileTypes: { json: { ttlSeconds: 60, policy: 'LRU' } },
    },
    domainLimit,
    existingOtherUrlsAllocated
  );
  assert.equal(validForm.valid, true);
  assert.equal(Object.keys(validForm.errors).length, 0);

  // Formulario que excede la cuota del dominio (pide 60 MB; 50 + 60 = 110 MB > 100 MB)
  const exceededForm = validateUrlForm(
    {
      pattern: '/downloads/*',
      cacheSizeBytes: 62914560, // 60 MB
      authType: 'none',
    },
    domainLimit,
    existingOtherUrlsAllocated
  );
  assert.equal(exceededForm.valid, false);
  assert.ok(exceededForm.errors.cacheSizeBytes);
  assert.match(exceededForm.errors.cacheSizeBytes, /supera el límite del dominio/i);

  // Error de tipo de autenticación no admitido
  const invalidAuth = validateUrlForm({
    pattern: '/secret/*',
    cacheSizeBytes: 10485760,
    authType: 'oauth2_bearer',
  });
  assert.equal(invalidAuth.valid, false);
  assert.ok(invalidAuth.errors.authType);
});


test('T-36/T-37: 5. Mapeo e interpretación de errores de API de URLs', () => {
  const err404 = parseUrlApiError({ status: 404, data: null });
  assert.match(err404.message, /no fue encontrado en el servidor/i);
  assert.equal(err404.code, 'NOT_FOUND');

  const err409 = parseUrlApiError({ status: 409, data: null });
  assert.match(err409.message, /ya existe una URL configurada con este mismo patrón/i);
  assert.equal(err409.code, 'PATTERN_ALREADY_EXISTS');

  const customBackendErr = parseUrlApiError({
    status: 400,
    data: { error: { code: 'DOMAIN_NOT_VERIFIED', message: 'El dominio aún no ha verificado su propiedad' } }
  });
  assert.equal(customBackendErr.code, 'DOMAIN_NOT_VERIFIED');
  assert.match(customBackendErr.message, /no ha verificado/i);
});


test('T-36: 6. Control de cuota en edición: excluye la URL actual al validar capacidad', () => {
  const domainLimit = 104857600; // 100 MB límite del dominio
  
  // Supongamos que el dominio tiene 2 URLs:
  // url1: 40 MB (la que vamos a editar)
  // url2: 50 MB (la otra URL)
  // Total actual: 90 MB / 100 MB.
  
  const existingUrls = [
    { id: 'url-1', pattern: '/api/*', cacheSizeBytes: 41943040 }, // 40 MB
    { id: 'url-2', pattern: '/static/*', cacheSizeBytes: 52428800 }, // 50 MB
  ];
  
  const editingUrlId = 'url-1';
  
  // La lógica en DomainUrlsPage.jsx es:
  // const otherUrls = urls.filter((u) => u.id !== editingUrl?.id);
  // const currentAllocatedBytes = otherUrls.reduce((sum, u) => sum + (Number(u.cacheSizeBytes) || 0), 0);
  const otherUrls = existingUrls.filter((u) => u.id !== editingUrlId);
  const currentAllocatedBytes = otherUrls.reduce((sum, u) => sum + (Number(u.cacheSizeBytes) || 0), 0);
  
  assert.equal(currentAllocatedBytes, 52428800); // Exactamente 50 MB (excluyó url-1)
  
  // Modificamos url-1 para que ahora ocupe 45 MB (aumento de 5 MB; total pasará a 95 MB <= 100 MB)
  const validEditForm = validateUrlForm(
    {
      pattern: '/api/*',
      cacheSizeBytes: 47185920, // 45 MB
      authType: 'api_key',
    },
    domainLimit,
    currentAllocatedBytes
  );
  
  // Debe ser VÁLIDO porque 50 MB + 45 MB = 95 MB <= 100 MB
  assert.equal(validEditForm.valid, true);
  
  // Si en cambio aumentara a 55 MB (50 MB + 55 MB = 105 MB > 100 MB), debe fallar
  const exceededEditForm = validateUrlForm(
    {
      pattern: '/api/*',
      cacheSizeBytes: 57671680, // 55 MB
      authType: 'api_key',
    },
    domainLimit,
    currentAllocatedBytes
  );
  assert.equal(exceededEditForm.valid, false);
  assert.match(exceededEditForm.errors.cacheSizeBytes, /supera el límite del dominio/i);
});
