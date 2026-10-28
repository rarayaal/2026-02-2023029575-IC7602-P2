import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isDomainVerified, txtRecordFor, txtRecordsMatch } from '../src/lib/txt.js';

describe('txtRecordFor', () => {
  it('builds the record the owner must publish', () => {
    assert.deepEqual(txtRecordFor('example.com', 'abc'), {
      name: '_proxycache-verify.example.com',
      type: 'TXT',
      value: 'proxycache-verification=abc',
    });
  });
});

describe('txtRecordsMatch', () => {
  it('joins chunks of a split record', () => {
    assert.equal(txtRecordsMatch([['proxycache-', 'verification=abc']], 'abc'), true);
  });

  it('ignores unrelated records', () => {
    assert.equal(txtRecordsMatch([['v=spf1 -all'], ['proxycache-verification=zzz']], 'abc'), false);
  });
});

describe('isDomainVerified', () => {
  it('queries the _proxycache-verify subdomain', async () => {
    let asked;
    const resolver = async (name) => {
      asked = name;
      return [['proxycache-verification=abc']];
    };
    assert.equal(await isDomainVerified('example.com', 'abc', resolver), true);
    assert.equal(asked, '_proxycache-verify.example.com');
  });

  it('returns false when the record does not exist', async () => {
    const resolver = async () => {
      throw Object.assign(new Error('not found'), { code: 'ENOTFOUND' });
    };
    assert.equal(await isDomainVerified('example.com', 'abc', resolver), false);
  });

  it('propagates unexpected DNS errors', async () => {
    const resolver = async () => {
      throw Object.assign(new Error('timeout'), { code: 'ETIMEOUT' });
    };
    await assert.rejects(isDomainVerified('example.com', 'abc', resolver));
  });
});
