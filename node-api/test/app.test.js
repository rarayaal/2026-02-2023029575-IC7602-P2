import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import app from '../src/app.js';

const SERVICE_TOKEN = 'test-service-token';
let server;
let baseUrl;

before(async () => {
  process.env.INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

describe('GET /api/health', () => {
  it('responds ok without credentials', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  });
});

describe('/api/internal service token', () => {
  it('rejects requests without a token', async () => {
    const res = await fetch(`${baseUrl}/api/internal/domains`);
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'MISSING_SERVICE_TOKEN');
  });

  it('rejects requests with a wrong token', async () => {
    const res = await fetch(`${baseUrl}/api/internal/domains`, {
      headers: { authorization: 'Bearer wrong' },
    });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'INVALID_SERVICE_TOKEN');
  });

  it('accepts requests with the right token', async () => {
    // Un cuerpo vacío falla la validación antes de llegar a Firestore: el 400 demuestra
    // que la petición ya pasó la autenticación.
    const res = await fetch(`${baseUrl}/api/internal/validate/api-key`, {
      method: 'POST',
      headers: { authorization: `Bearer ${SERVICE_TOKEN}`, 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'INVALID_BODY');
  });
});

describe('unknown routes', () => {
  it('respond 404 with the standard error shape', async () => {
    const res = await fetch(`${baseUrl}/api/nope`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'NOT_FOUND');
  });

  it('reject malformed JSON with 400', async () => {
    const res = await fetch(`${baseUrl}/api/internal/validate/api-key`, {
      method: 'POST',
      headers: { authorization: `Bearer ${SERVICE_TOKEN}`, 'content-type': 'application/json' },
      body: '{bad json',
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'INVALID_JSON');
  });
});
