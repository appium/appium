import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {EnvProxyResolver} from '../../../lib/basedriver/helpers/env-proxy.js';

const url = (value: string) => new URL(value);

describe('EnvProxyResolver', function () {
  it('should not proxy anything if no proxy is configured', function () {
    const resolver = new EnvProxyResolver({});
    assert.strictEqual(resolver.getProxyForUrl(url('http://example.com/app.apk')), '');
    assert.strictEqual(resolver.getProxyForUrl(url('https://example.com/app.apk')), '');
  });

  it('should select the proxy by scheme and fall back to all_proxy', function () {
    const resolver = new EnvProxyResolver({
      HTTP_PROXY: 'http://http.proxy:8080',
      https_proxy: 'http://https.proxy:8080',
    });
    assert.strictEqual(resolver.getProxyForUrl(url('http://example.com/app.apk')), 'http://http.proxy:8080');
    assert.strictEqual(resolver.getProxyForUrl(url('https://example.com/app.apk')), 'http://https.proxy:8080');

    const fallback = new EnvProxyResolver({ALL_PROXY: 'all.proxy:3128'});
    assert.strictEqual(fallback.getProxyForUrl(url('http://example.com/app.apk')), 'http://all.proxy:3128');
    assert.strictEqual(fallback.getProxyForUrl(url('https://example.com/app.apk')), 'https://all.proxy:3128');
  });

  it('should ignore npm_config_* variables like proxy-from-env@2 does', function () {
    const onlyNpm = new EnvProxyResolver({
      npm_config_proxy: 'http://npm.proxy:8080',
      npm_config_http_proxy: 'http://npm.proxy:8080',
      npm_config_https_proxy: 'http://npm.proxy:8080',
    });
    assert.strictEqual(onlyNpm.getProxyForUrl(url('http://example.com/app.apk')), '');
    assert.strictEqual(onlyNpm.getProxyForUrl(url('https://example.com/app.apk')), '');

    const npmNoProxy = new EnvProxyResolver({
      HTTP_PROXY: 'http://http.proxy:8080',
      npm_config_no_proxy: '*',
    });
    assert.strictEqual(npmNoProxy.getProxyForUrl(url('http://example.com/app.apk')), 'http://http.proxy:8080');
  });

  it('should honor no_proxy entries', function () {
    const withNoProxy = (noProxy: string) =>
      new EnvProxyResolver({HTTP_PROXY: 'http://http.proxy:8080', NO_PROXY: noProxy});
    const proxied = (noProxy: string, target: string) => Boolean(withNoProxy(noProxy).getProxyForUrl(url(target)));

    assert.strictEqual(proxied('*', 'http://example.com/'), false);
    assert.strictEqual(proxied('example.com', 'http://example.com/'), false);
    assert.strictEqual(proxied('EXAMPLE.com', 'http://example.com/'), false);
    assert.strictEqual(proxied('example.com', 'http://sub.example.com/'), true);
    assert.strictEqual(proxied('.example.com', 'http://sub.example.com/'), false);
    assert.strictEqual(proxied('*.example.com', 'http://sub.example.com/'), false);
    assert.strictEqual(proxied('*example.com', 'http://notexample.com/'), false);
    assert.strictEqual(proxied('example.com:8080', 'http://example.com:8080/'), false);
    assert.strictEqual(proxied('example.com:8080', 'http://example.com/'), true);
    assert.strictEqual(proxied('example.com:80', 'http://example.com/'), false);
    assert.strictEqual(proxied('example.net, example.com', 'http://example.com/'), false);
    assert.strictEqual(proxied('example.net example.org', 'http://example.com/'), true);
    assert.strictEqual(proxied('[::1]', 'http://[::1]:4723/'), false);
    assert.strictEqual(proxied('::1', 'http://[::1]:4723/'), true);
  });
});
