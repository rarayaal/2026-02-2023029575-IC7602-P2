/**
 * Pruebas automatizadas de aceptación para la tarea T-39:
 * Formulario de autenticación y gestión de sesiones de Caché Zonal.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isValidIdentifier,
  sanitizeRedirectPath,
  buildCacheRedirectUrl,
  createSession,
  deleteSession,
  saveLocalSession,
  getLocalSession,
  clearLocalSession,
} from '../src/services/sessionService.js';

// Mock simple de window y sessionStorage para entornos Node.js
if (typeof globalThis.window === 'undefined') {
  const store = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => store.get(key) || null,
      setItem: (key, val) => store.set(key, String(val)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    },
    dispatchEvent: () => true,
  };
}

test('T-39: 1. Validación de identificadores seguros (evitar inyección de rutas en Firestore)', () => {
  assert.equal(isValidIdentifier('example.com'), true);
  assert.equal(isValidIdentifier('u2'), true);
  assert.equal(isValidIdentifier('ana_admin'), true);

  // Caracteres prohibidos
  assert.equal(isValidIdentifier('domain/extra'), false);
  assert.equal(isValidIdentifier('../u2'), false);
  assert.equal(isValidIdentifier(''), false);
  assert.equal(isValidIdentifier('   '), false);
  assert.equal(isValidIdentifier(null), false);
});

test('T-39: 2. Sanitización estricta de rutas de redirección (prevención de Open Redirect)', () => {
  // Rutas relativas seguras
  assert.equal(sanitizeRedirectPath('/admin/panel'), '/admin/panel');
  assert.equal(sanitizeRedirectPath('/dashboard?user=1'), '/dashboard?user=1');

  // URL absoluta con mismo u otro dominio: extrae únicamente pathname y search
  assert.equal(sanitizeRedirectPath('http://example.com/admin/panel'), '/admin/panel');
  assert.equal(sanitizeRedirectPath('https://attacker.com/evil?token=123'), '/evil?token=123');

  // Intentos de bypass con protocolo relativo //malicious.com
  assert.equal(sanitizeRedirectPath('//malicious.com/attack'), '/');

  // Valores vacíos o inválidos retornan '/'
  assert.equal(sanitizeRedirectPath(''), '/');
  assert.equal(sanitizeRedirectPath(null), '/');
  assert.equal(sanitizeRedirectPath(undefined), '/');

  // Rutas sin barra inicial
  assert.equal(sanitizeRedirectPath('admin/settings'), '/admin/settings');
});

test('T-39: 3. Construcción de URL de callback hacia la Caché Zonal', () => {
  const redirectUrl = buildCacheRedirectUrl(
    'example.com',
    'st_8a1f4b2c9d0e',
    'http://example.com/admin/panel'
  );

  assert.equal(
    redirectUrl,
    'http://example.com/__zc/session?token=st_8a1f4b2c9d0e&redirect=%2Fadmin%2Fpanel'
  );

  // Verificación de normalización de dominio a minúsculas
  const redirectUpper = buildCacheRedirectUrl(
    'APP.LOCAL',
    'st_9999',
    '/private'
  );
  assert.equal(
    redirectUpper,
    'http://app.local/__zc/session?token=st_9999&redirect=%2Fprivate'
  );

  // Verificación de conservación del puerto del proxy (ej. :8080)
  const redirectWithPort = buildCacheRedirectUrl(
    'app.local',
    'st_port_test',
    'http://app.local:8080/admin/panel'
  );
  assert.equal(
    redirectWithPort,
    'http://app.local:8080/__zc/session?token=st_port_test&redirect=%2Fadmin%2Fpanel'
  );
});

test('T-39: 4. Validación de campos obligatorios en createSession', async () => {
  // Dominio vacío
  const res1 = await createSession({ domain: '', urlId: 'u1', username: 'ana', password: '123' });
  assert.equal(res1.ok, false);
  assert.match(res1.error, /dominio es obligatorio/i);

  // urlId vacío
  const res2 = await createSession({ domain: 'app.local', urlId: '', username: 'ana', password: '123' });
  assert.equal(res2.ok, false);
  assert.match(res2.error, /urlId.*obligatorio/i);

  // username vacío
  const res3 = await createSession({ domain: 'app.local', urlId: 'u1', username: '', password: '123' });
  assert.equal(res3.ok, false);
  assert.match(res3.error, /usuario es obligatorio/i);

  // password vacía
  const res4 = await createSession({ domain: 'app.local', urlId: 'u1', username: 'ana', password: '' });
  assert.equal(res4.ok, false);
  assert.match(res4.error, /contraseña es obligatoria/i);

  // Caracteres peligrosos con barra en identificadores
  const res5 = await createSession({ domain: 'app/evil', urlId: 'u1', username: 'ana', password: '123' });
  assert.equal(res5.ok, false);
  assert.match(res5.error, /barras inclinadas/i);
});

test('T-39: 5. Ciclo de vida y expiración de sesiones locales (sessionStorage)', () => {
  clearLocalSession();
  assert.equal(getLocalSession(), null);

  // Guardar sesión activa válida (expira en el futuro)
  const futureExp = new Date(Date.now() + 3600 * 1000).toISOString();
  saveLocalSession({
    domain: 'app.local',
    urlId: 'u2',
    username: 'admin',
    sessionToken: 'st_mock_token_abc',
    expiresAt: futureExp,
  });

  const session = getLocalSession();
  assert.ok(session);
  assert.equal(session.domain, 'app.local');
  assert.equal(session.username, 'admin');
  assert.equal(session.sessionToken, 'st_mock_token_abc');

  // Sesión expirada
  const pastExp = new Date(Date.now() - 60 * 1000).toISOString();
  saveLocalSession({
    domain: 'app.local',
    urlId: 'u2',
    username: 'admin',
    sessionToken: 'st_expired_token',
    expiresAt: pastExp,
  });

  // Debe autolimpiarse al consultar
  assert.equal(getLocalSession(), null);

  // Limpieza explícita
  saveLocalSession({ domain: 'test.local', urlId: 'u1', username: 'user', sessionToken: 'st_1' });
  clearLocalSession();
  assert.equal(getLocalSession(), null);
});

test('T-39: 6. Cierre de sesión (deleteSession) limpia estado local de forma segura', async () => {
  saveLocalSession({
    domain: 'app.local',
    urlId: 'u1',
    username: 'ana',
    sessionToken: 'st_to_delete',
  });

  assert.ok(getLocalSession());

  // Ejecutar deleteSession
  const res = await deleteSession('st_to_delete');
  // En ambiente sin API real, maneja el error de red o configuración y limpia la sesión local
  assert.equal(getLocalSession(), null);
});
