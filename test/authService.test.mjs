/**
 * Pruebas unitarias para T-34: authService.js
 * Validación de correos electrónicos, contraseñas y formularios de registro.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isValidEmail,
  validatePassword,
  validateRegistrationForm,
} from '../src/services/authService.js';

test('T-34: 1. Validación de formato de correo electrónico (RFC 5322)', () => {
  // Correos válidos
  assert.equal(isValidEmail('usuario@example.com'), true);
  assert.equal(isValidEmail('ana.admin@dominio.co.cr'), true);
  assert.equal(isValidEmail('test+alias@empresa.org'), true);

  // Correos inválidos
  assert.equal(isValidEmail('sin-arroba.com'), false);
  assert.equal(isValidEmail('@sin-usuario.com'), false);
  assert.equal(isValidEmail('usuario@'), false);
  assert.equal(isValidEmail('usuario@.com'), false);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail('   '), false);
  assert.equal(isValidEmail(null), false);
  assert.equal(isValidEmail(undefined), false);
});

test('T-34: 2. Validación de longitud de contraseña (mínimo 6 caracteres)', () => {
  // Contraseñas válidas
  const p1 = validatePassword('123456');
  assert.equal(p1.valid, true);
  assert.equal(p1.message, null);

  const p2 = validatePassword('clave-segura-ic7602');
  assert.equal(p2.valid, true);

  // Contraseñas inválidas (< 6 caracteres o vacías)
  const short = validatePassword('12345');
  assert.equal(short.valid, false);
  assert.match(short.message, /al menos 6 caracteres/i);

  const empty = validatePassword('');
  assert.equal(empty.valid, false);
  assert.match(empty.message, /obligatoria/i);

  const nullPwd = validatePassword(null);
  assert.equal(nullPwd.valid, false);
});

test('T-34: 3. Validación de formulario de registro de cuenta', () => {
  // Formulario válido
  const valid = validateRegistrationForm({
    displayName: 'Alexandra De Gracia',
    email: 'alexandra@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  });
  assert.equal(valid.valid, true);
  assert.equal(Object.keys(valid.errors).length, 0);

  // Nombre muy corto o vacío
  const badName = validateRegistrationForm({
    displayName: 'A',
    email: 'alex@example.com',
    password: 'password123',
  });
  assert.equal(badName.valid, false);
  assert.ok(badName.errors.displayName);

  // Contraseñas no coinciden
  const mismatch = validateRegistrationForm({
    displayName: 'Alexandra',
    email: 'alex@example.com',
    password: 'password123',
    confirmPassword: 'differentPassword',
  });
  assert.equal(mismatch.valid, false);
  assert.match(mismatch.errors.confirmPassword, /no coinciden/i);
});
