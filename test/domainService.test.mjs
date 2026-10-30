/**
 * Pruebas unitarias para T-34 y T-35: domainService.js
 * Normalización de dominios, validación de sintaxis FQDN (RFC 1035) y formularios.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeDomain,
  validateDomainSyntax,
  validateDomainForm,
  getDnsTxtSpec,
  parseDomainApiError,
} from '../src/services/domainService.js';

test('T-34/T-35: 1. Normalización estricta de nombres de dominio', () => {
  // Conversión a minúsculas
  assert.equal(normalizeDomain('EXAMPLE.COM'), 'example.com');
  assert.equal(normalizeDomain('App.Local'), 'app.local');

  // Remoción de esquemas accidentales
  assert.equal(normalizeDomain('https://example.com'), 'example.com');
  assert.equal(normalizeDomain('http://app.local/'), 'app.local');

  // Remoción de rutas, queries y fragmentos
  assert.equal(normalizeDomain('example.com/admin/panel?user=1#tag'), 'example.com');

  // Remoción de puerto accidental (debe ir en origen, no en el dominio)
  assert.equal(normalizeDomain('app.local:8080'), 'app.local');

  // Remoción de puntos y espacios finales
  assert.equal(normalizeDomain('  example.com...  '), 'example.com');

  // Casos nulos o vacíos
  assert.equal(normalizeDomain(''), '');
  assert.equal(normalizeDomain(null), '');
  assert.equal(normalizeDomain(undefined), '');
});

test('T-34/T-35: 2. Validación de sintaxis de dominio (FQDN según RFC 1035)', () => {
  // Dominios sintácticamente válidos
  assert.equal(validateDomainSyntax('example.com').valid, true);
  assert.equal(validateDomainSyntax('app.local').valid, true);
  assert.equal(validateDomainSyntax('api.proxy-cache.co.cr').valid, true);

  // Errores con protocolo o barras
  const withProtocol = validateDomainSyntax('http://example.com');
  assert.equal(withProtocol.valid, false);
  assert.match(withProtocol.error, /sin protocolo/i);

  const withSlash = validateDomainSyntax('example.com/admin');
  assert.equal(withSlash.valid, false);
  assert.match(withSlash.error, /sin rutas/i);

  const withPort = validateDomainSyntax('example.com:8080');
  assert.equal(withPort.valid, false);
  assert.match(withPort.error, /puerto no forma parte del dominio/i);

  // Dominio sin extensión o sin punto
  const noDot = validateDomainSyntax('localhost');
  assert.equal(noDot.valid, false);
  assert.match(noDot.error, /incluir una extensión/i);

  // Etiquetas vacías o puntos consecutivos
  const consecutiveDots = validateDomainSyntax('example..com');
  assert.equal(consecutiveDots.valid, false);
  assert.match(consecutiveDots.error, /puntos consecutivos/i);

  // Caracteres prohibidos en etiqueta
  const invalidChars = validateDomainSyntax('exam_ple.com');
  assert.equal(invalidChars.valid, false);
  assert.match(invalidChars.error, /caracteres no válidos/i);
});

test('T-34: 3. Validación de formulario de registro de dominio y origen', () => {
  // Formulario completo válido
  const validData = {
    name: 'app.local',
    originScheme: 'http',
    originHost: 'origin',
    originPort: 80,
    cacheSizeBytes: 104857600, // 100 MB
  };
  const validRes = validateDomainForm(validData);
  assert.equal(validRes.valid, true);
  assert.equal(Object.keys(validRes.errors).length, 0);

  // Esquema de origen inválido
  const invalidScheme = validateDomainForm({
    ...validData,
    originScheme: 'ftp',
  });
  assert.equal(invalidScheme.valid, false);
  assert.ok(invalidScheme.errors.originScheme);

  // Puerto de origen fuera de rango (1-65535)
  const invalidPort = validateDomainForm({
    ...validData,
    originPort: 70000,
  });
  assert.equal(invalidPort.valid, false);
  assert.ok(invalidPort.errors.originPort);

  // Tamaño de caché no positivo o inválido
  const invalidCache = validateDomainForm({
    ...validData,
    cacheSizeBytes: -50,
  });
  assert.equal(invalidCache.valid, false);
  assert.ok(invalidCache.errors.cacheSizeBytes);
});

test('T-34: 4. Generación de especificación de registro DNS TXT para verificación', () => {
  const spec = getDnsTxtSpec('Example.Com', 'token_abc123');
  assert.equal(spec.recordHost, '_proxycache-verify.example.com');
  assert.equal(spec.recordType, 'TXT');
  assert.equal(spec.recordValue, 'proxycache-verification=token_abc123');
});


test('T-34/T-35: 5. Mapeo e interpretación de errores de API de dominios', () => {
  const err404 = parseDomainApiError({ status: 404, data: null });
  assert.match(err404.message, /no fue encontrado en el servidor/i);
  assert.equal(err404.code, 'NOT_FOUND');

  const err409 = parseDomainApiError({ status: 409, data: null });
  assert.match(err409.message, /ya se encuentra registrado/i);
  assert.equal(err409.code, 'DOMAIN_ALREADY_EXISTS');

  const customBackendErr = parseDomainApiError({
    status: 400,
    data: { error: { code: 'TXT_RECORD_NOT_FOUND', message: 'No se encontró el registro TXT _proxycache-verify' } }
  });
  assert.equal(customBackendErr.code, 'TXT_RECORD_NOT_FOUND');
  assert.match(customBackendErr.message, /_proxycache-verify/);
});
