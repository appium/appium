import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {parseWebhookUri} from '../../lib/logsink.js';

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

  it('should keep understanding the legacy host:port form', function () {
    assert.deepStrictEqual(parseWebhookUri('localhost:9003'), {
      host: 'localhost',
      port: 9003,
      path: '/',
      ssl: false,
    });
  });

  it('should fall back to the legacy host if only a port is given', function () {
    assert.deepStrictEqual(parseWebhookUri(':9003'), {
      host: '127.0.0.1',
      port: 9003,
      path: '/',
      ssl: false,
    });
  });

  it('should fall back to the legacy port if it is not a number', function () {
    assert.deepStrictEqual(parseWebhookUri('localhost:nope'), {
      host: 'localhost',
      port: 9003,
      path: '/',
      ssl: false,
    });
  });

  it('should fall back to the legacy defaults if there is nothing to parse', function () {
    assert.deepStrictEqual(parseWebhookUri('not-a-uri'), {
      host: '127.0.0.1',
      port: 9003,
      path: '/',
      ssl: false,
    });
  });

  it('should reject a parseable url with an unsupported protocol', function () {
    assert.throws(() => parseWebhookUri('ftp://host/x'), /must be an http\(s\) URL/);
  });
});
