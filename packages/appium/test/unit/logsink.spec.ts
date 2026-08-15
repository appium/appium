import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {parseWebhookUri} from '../../lib/logsink';

describe('parseWebhookUri', function () {
  it('should parse an http webhook with a path', function () {
    assert.deepStrictEqual(parseWebhookUri('http://0.0.0.0/hook'), {
      host: '0.0.0.0',
      port: 80,
      path: '/hook',
      ssl: false,
    });
  });

  it('should parse an https webhook and default the port', function () {
    assert.deepStrictEqual(parseWebhookUri('https://some-url.com'), {
      host: 'some-url.com',
      port: 443,
      path: '/',
      ssl: true,
    });
  });

  it('should preserve an explicit port and query string', function () {
    assert.deepStrictEqual(parseWebhookUri('https://example.com:8443/a/b?x=1'), {
      host: 'example.com',
      port: 8443,
      path: '/a/b?x=1',
      ssl: true,
    });
  });

  it('should reject a value that is not a URI', function () {
    assert.throws(() => parseWebhookUri('not-a-uri'), /Invalid URL/);
  });
});
