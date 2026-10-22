import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compareBySpecificity,
  fileTypesToArray,
  normalizeDomain,
  patternSpecificity,
  toUrlConfig,
} from '../src/lib/config.js';

describe('normalizeDomain', () => {
  it('lowercases, trims and drops the trailing dot', () => {
    assert.equal(normalizeDomain(' Example.COM. '), 'example.com');
  });
});

describe('patternSpecificity', () => {
  it('counts literal characters only', () => {
    assert.equal(patternSpecificity('/images/*'), 8);
    assert.equal(patternSpecificity('/*'), 1);
    assert.equal(patternSpecificity('/*.css'), 5);
  });
});

describe('compareBySpecificity', () => {
  it('orders patterns from most to least specific', () => {
    const urls = ['/*', '/admin/*', '/admin/panel', '/*.css'].map((pattern) => ({ pattern }));
    assert.deepEqual(
      urls.sort(compareBySpecificity).map((u) => u.pattern),
      ['/admin/panel', '/admin/*', '/*.css', '/*'],
    );
  });

  it('breaks ties by fewer wildcards', () => {
    const urls = [{ pattern: '/a*b*' }, { pattern: '/a*b' }];
    assert.deepEqual(
      urls.sort(compareBySpecificity).map((u) => u.pattern),
      ['/a*b', '/a*b*'],
    );
  });
});

describe('fileTypesToArray', () => {
  it('converts the map to an array with the default "*" last', () => {
    const result = fileTypesToArray({
      '*': { ttlSeconds: 300, policy: 'RANDOM' },
      png: { ttlSeconds: 86400, policy: 'FIFO' },
      css: { ttlSeconds: 3600, policy: 'LFU' },
    });
    assert.deepEqual(result.map((f) => f.extension), ['css', 'png', '*']);
    assert.deepEqual(result[0], { extension: 'css', ttlSeconds: 3600, policy: 'LFU' });
  });

  it('returns an empty array when there are no file types', () => {
    assert.deepEqual(fileTypesToArray(undefined), []);
  });
});

describe('toUrlConfig', () => {
  it('defaults auth type to none', () => {
    const result = toUrlConfig('u1', { pattern: '/*', cacheSizeBytes: 10 });
    assert.deepEqual(result, {
      id: 'u1',
      pattern: '/*',
      cacheSizeBytes: 10,
      auth: { type: 'none' },
      fileTypes: [],
    });
  });
});
