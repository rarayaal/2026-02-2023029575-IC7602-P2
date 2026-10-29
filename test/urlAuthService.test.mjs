/**
 * Pruebas unitarias para T-38: urlAuthService.js
 * Generación de API keys, prefijos públicos y hash SHA-256 (nativo y fallback).
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateRawApiKey,
  getApiKeyPrefix,
  hashSha256,
  validateApiKeyName,
  validateUrlUsername,
  validateUrlUserPassword,
  parseUrlAuthApiError,
} from '../src/services/urlAuthService.js';

test('T-38: 1. Generación de API keys criptográficas (formato pk_ + 64 hex)', () => {
  const key1 = generateRawApiKey();
  const key2 = generateRawApiKey();

  // Debe comenzar con el prefijo "pk_"
  assert.equal(key1.startsWith('pk_'), true);
  assert.equal(key2.startsWith('pk_'), true);

  // Longitud total: 3 caracteres ('pk_') + 64 caracteres hex = 67
  assert.equal(key1.length, 67);
  assert.equal(key2.length, 67);

  // Expresión regular estricta de formato
  const apiKeyRegex = /^pk_[0-9a-f]{64}$/;
  assert.equal(apiKeyRegex.test(key1), true);
  assert.equal(apiKeyRegex.test(key2), true);

  // Las claves deben ser aleatorias y únicas
  assert.notEqual(key1, key2);
});

test('T-38: 2. Extracción de prefijo de identificación pública (10 caracteres)', () => {
  const sampleKey = 'pk_3fa91c2805efd91823901b2a9845cd723901b2a9845cd723901b2a9845cd7239';
  const prefix = getApiKeyPrefix(sampleKey);

  // Según docs/modelo-datos.md línea 154:
  // "prefix: Primeros 10 caracteres de la key, para identificarla en la UI"
  assert.equal(prefix, 'pk_3fa91c2');
  assert.equal(prefix.length, 10);

  // Manejo de valores vacíos
  assert.equal(getApiKeyPrefix(''), '');
  assert.equal(getApiKeyPrefix(null), '');
});

test('T-38: 3. Algoritmo de hash SHA-256 (vectores de prueba estándar)', async () => {
  // Vectores estándar FIPS 180-4
  const vectorAbc = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  const vectorHello = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

  const hashEmpty = await hashSha256('');
  assert.equal(hashEmpty, '');

  const hashAbc = await hashSha256('abc');
  assert.equal(hashAbc, vectorAbc);

  const hashHello = await hashSha256('hello');
  assert.equal(hashHello, vectorHello);

  const testKey = 'pk_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const hashKey = await hashSha256(testKey);
  assert.equal(hashKey.length, 64);
  assert.equal(/^[0-9a-f]{64}$/.test(hashKey), true);
});

test('T-38: 4. Validación de nombres descriptivos y credenciales de usuarios de URL', () => {
  // Nombres de API key
  assert.equal(validateApiKeyName('Postman Dev').valid, true);
  assert.equal(validateApiKeyName('').valid, false);
  assert.equal(validateApiKeyName('A').valid, false);

  // Nombres de usuario de URL
  assert.equal(validateUrlUsername('ana_admin').valid, true);
  assert.equal(validateUrlUsername('user.test-1').valid, true);
  assert.equal(validateUrlUsername('us').valid, false); // < 3 chars
  assert.equal(validateUrlUsername('user/slash').valid, false); // prohibido '/'

  // Contraseñas de usuario de URL
  assert.equal(validateUrlUserPassword('secret123').valid, true);
  assert.equal(validateUrlUserPassword('12345').valid, false);
  assert.equal(validateUrlUserPassword('a'.repeat(128)).valid, true);
  assert.equal(validateUrlUserPassword('a'.repeat(129)).valid, false);
});


test('T-38: 5. Mapeo e interpretación de errores de API de credenciales', () => {
  // 404 específicos
  const keyNotFound = parseUrlAuthApiError({ status: 404, data: { error: { code: 'API_KEY_NOT_FOUND' } } });
  assert.match(keyNotFound.message, /API key solicitada no existe/i);
  assert.equal(keyNotFound.code, 'API_KEY_NOT_FOUND');

  const userNotFound = parseUrlAuthApiError({ status: 404, data: { error: { code: 'USER_NOT_FOUND' } } });
  assert.match(userNotFound.message, /usuario solicitado no fue encontrado/i);
  assert.equal(userNotFound.code, 'USER_NOT_FOUND');

  // 409 específicos
  const keyExists = parseUrlAuthApiError({ status: 409, data: { error: { code: 'API_KEY_ALREADY_EXISTS' } } });
  assert.match(keyExists.message, /Ya existe una API key/i);

  const userExists = parseUrlAuthApiError({ status: 409, data: { error: { code: 'USER_ALREADY_EXISTS' } } });
  assert.match(userExists.message, /Ya existe un usuario/i);

  const authMismatch = parseUrlAuthApiError({ status: 409, data: { error: { code: 'AUTH_TYPE_MISMATCH', message: 'Mecanismo incompatible' } } });
  assert.equal(authMismatch.message, 'Mecanismo incompatible');
});
