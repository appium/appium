import assert from 'node:assert/strict';
import type {LookupAddress} from 'node:dns';
import {afterEach, describe, it, mock} from 'node:test';
import {promisify} from 'node:util';

import type {AxiosRequestConfig} from 'axios';

import type * as appUrlRulesModule from '../../../lib/basedriver/helpers/app-url-rules.js';
import {appUrlRules, setAppUrlRules} from '../../../lib/basedriver/helpers/app-url-rules.js';
import {log as logger} from '../../../lib/helpers/logger.js';

const url = (value: string) => new URL(value);
const NOT_ALLOWED = 'is not allowed by the server configuration';

type Lookup = (hostname: string, options: {all?: boolean; family?: number}) => Promise<LookupAddress[] | string>;

function getLookup(requestOpts: AxiosRequestConfig): Lookup {
  const lookup = requestOpts.lookup as (...args: any[]) => void;
  assert.strictEqual(typeof lookup, 'function');
  return promisify(lookup) as Lookup;
}

describe('app-url-rules', function () {
  afterEach(function () {
    appUrlRules.configure();
  });

  describe('configure()', function () {
    it('should not set any rules by default', function () {
      assert.strictEqual(appUrlRules.config, undefined);
    });

    it('should set and reset the rules', function () {
      appUrlRules.configure({httpsOnly: true, maxRedirects: 0});
      assert.deepStrictEqual(appUrlRules.config, {httpsOnly: true, maxRedirects: 0});
      appUrlRules.configure(null);
      assert.strictEqual(appUrlRules.config, undefined);
    });

    it('should treat empty rules as no rules', function () {
      appUrlRules.configure({});
      assert.strictEqual(appUrlRules.config, undefined);
    });

    it('should be configurable via the driver helper', function () {
      setAppUrlRules({httpsOnly: true});
      assert.deepStrictEqual(appUrlRules.config, {httpsOnly: true});
      setAppUrlRules(null);
      assert.strictEqual(appUrlRules.config, undefined);
    });

    it('should reject an invalid address or subnet', function () {
      assert.throws(
        () => appUrlRules.configure({allow: ['10.0.0.0/nope']}),
        (e: TypeError) =>
          /invalid IP address or subnet '10\.0\.0\.0\/nope'/.test(e.message) &&
          /subnet prefix 'nope' must be a non-negative integer/.test((e.cause as Error).message),
      );
      assert.throws(
        () => appUrlRules.configure({allow: ['10.0.0.0/33']}),
        (e: TypeError) => /invalid IP address or subnet '10\.0\.0\.0\/33'/.test(e.message) && e.cause instanceof Error,
      );
      assert.throws(() => appUrlRules.configure({deny: ['a/b/c']}), /invalid IP address or hostname/);
      assert.throws(() => appUrlRules.configure({deny: ['example.com/8']}), /invalid IP address or hostname/);
      assert.throws(() => appUrlRules.configure({deny: ['']}), /invalid IP address or hostname/);
      assert.strictEqual(appUrlRules.config, undefined);
    });

    it('should reject unknown rules', function () {
      assert.throws(() => appUrlRules.configure({allowPorts: [443]} as any), /'allowPorts' is not supported/);
      assert.strictEqual(appUrlRules.config, undefined);
    });

    it('should share the rules between multiple copies of the module', async function () {
      // ESM caches modules by URL, so a different query string yields an independent module instance,
      // like a driver resolving its own copy of @appium/base-driver would get
      const otherCopy: typeof appUrlRulesModule = await import(
        `../../../lib/basedriver/helpers/app-url-rules.js?copy=${Date.now()}`
      );
      assert.notStrictEqual(otherCopy.appUrlRules, appUrlRules);

      appUrlRules.configure({httpsOnly: true});
      assert.deepStrictEqual(otherCopy.appUrlRules.config, {httpsOnly: true});
      assert.throws(
        () => otherCopy.appUrlRules.assertUrlAllowed(url('http://example.com/app.apk')),
        /is not allowed by the server configuration/,
      );
      assert.throws(
        () => otherCopy.appUrlRules.assertRequestAllowed({url: 'http://example.com/app.apk'}),
        /is not allowed by the server configuration/,
      );

      otherCopy.appUrlRules.configure({deny: ['example.com']});
      assert.throws(
        () => appUrlRules.assertUrlAllowed(url('http://example.com/app.apk')),
        /is not allowed by the server configuration/,
      );
      appUrlRules.assertUrlAllowed(url('http://example.net/app.apk'));

      otherCopy.appUrlRules.configure();
      assert.strictEqual(appUrlRules.config, undefined);
      appUrlRules.assertUrlAllowed(url('http://example.com/app.apk'));
    });
  });

  describe('assertUrlAllowed()', function () {
    it('should allow any URL if no rules are set', function () {
      appUrlRules.assertUrlAllowed(url('http://user:pass@example.com/app.apk'));
    });

    it('should return the given URL for chaining', function () {
      const appUrl = url('https://example.com/app.apk');
      assert.strictEqual(appUrlRules.assertUrlAllowed(appUrl), appUrl);
      appUrlRules.configure({httpsOnly: true});
      assert.strictEqual(appUrlRules.assertUrlAllowed(appUrl), appUrl);
    });

    it('should enforce httpsOnly', function () {
      appUrlRules.configure({httpsOnly: true});
      appUrlRules.assertUrlAllowed(url('https://example.com/app.apk'));
      assert.throws(
        () => appUrlRules.assertUrlAllowed(url('http://example.com/app.apk')),
        /is not allowed by the server configuration/,
      );
    });

    it('should enforce allowCredentials', function () {
      appUrlRules.configure({allowCredentials: false});
      appUrlRules.assertUrlAllowed(url('https://example.com/app.apk'));
      assert.throws(
        () => appUrlRules.assertUrlAllowed(url('https://user@example.com/app.apk')),
        /is not allowed by the server configuration/,
      );
      assert.throws(
        () => appUrlRules.assertUrlAllowed(url('https://:pass@example.com/app.apk')),
        /is not allowed by the server configuration/,
      );
    });

    it('should neither report nor log the violated rule', function () {
      const logged: string[] = [];
      const mocks = (['error', 'warn', 'info', 'debug'] as const).map((level) =>
        mock.method(logger, level, (message: string) => {
          logged.push(message);
        }),
      );
      try {
        appUrlRules.configure({deny: ['*.evil.com']});
        const message = `The application URL 'https://app.evil.com/app.apk' ${NOT_ALLOWED}`;
        assert.throws(
          () => appUrlRules.assertUrlAllowed(url('https://app.evil.com/app.apk')),
          (e: Error) => e.message === message,
        );
        assert.deepStrictEqual(logged, [message]);
      } finally {
        mocks.forEach((m) => m.mock.restore());
      }
    });

    it('should not include credentials in the error message', function () {
      appUrlRules.configure({httpsOnly: true});
      assert.throws(
        () => appUrlRules.assertUrlAllowed(url('http://user:s3cret@example.com/app.apk')),
        (e: Error) => !e.message.includes('s3cret') && e.message.includes("'http://example.com/app.apk'"),
      );
    });

    it('should enforce hostname deny rules', function () {
      appUrlRules.configure({deny: ['*.evil.com']});
      appUrlRules.assertUrlAllowed(url('https://example.com/app.apk'));
      assert.throws(
        () => appUrlRules.assertUrlAllowed(url('https://app.evil.com/app.apk')),
        /is not allowed by the server configuration/,
      );
    });

    it('should normalize and enforce hostname allow rules', function () {
      appUrlRules.configure({allow: ['*.example.com', 'münich.example']});
      appUrlRules.assertUrlAllowed(url('https://a.example.com/app.apk'));
      appUrlRules.assertUrlAllowed(url('https://a.b.example.com/app.apk'));
      appUrlRules.assertUrlAllowed(url('https://B.EXAMPLE.COM./app.apk'));
      appUrlRules.assertUrlAllowed(url('https://münich.example/app.apk'));
      appUrlRules.assertUrlAllowed(url('https://xn--mnich-kva.example/app.apk'));
      for (const hostname of ['example.com', 'c.example.net', 'example.com.evil.net']) {
        assert.throws(
          () => appUrlRules.assertUrlAllowed(url(`https://${hostname}/app.apk`)),
          /is not allowed by the server configuration/,
          hostname,
        );
      }
    });

    it('should support picomatch glob patterns', function () {
      appUrlRules.configure({
        allow: ['apps.{staging,prod}.example.com', 'build-?.example.com', 'node[0-9].example.com', 'münich.*'],
      });
      for (const hostname of [
        'apps.staging.example.com',
        'apps.prod.example.com',
        'build-a.example.com',
        'node7.example.com',
        'münich.example',
        'xn--mnich-kva.example.org',
      ]) {
        appUrlRules.assertUrlAllowed(url(`https://${hostname}/app.apk`));
      }
      for (const hostname of [
        'apps.dev.example.com',
        'build-ab.example.com',
        'nodex.example.com',
        'munich.example',
        'a.münich.example',
      ]) {
        assert.throws(
          () => appUrlRules.assertUrlAllowed(url(`https://${hostname}/app.apk`)),
          /is not allowed by the server configuration/,
          hostname,
        );
      }
    });

    it('should match dots in hostname patterns literally', function () {
      appUrlRules.configure({allow: ['app.example.com']});
      assert.throws(
        () => appUrlRules.assertUrlAllowed(url('https://appxexample.com/app.apk')),
        /is not allowed by the server configuration/,
      );
    });

    it('should enforce IPv4 and IPv6 address rules', function () {
      appUrlRules.configure({allow: ['10.0.0.0/8', '2001:db8::/32'], deny: ['10.1.2.3']});
      appUrlRules.assertUrlAllowed(url('http://10.2.3.4/app.apk'));
      appUrlRules.assertUrlAllowed(url('http://[2001:db8::1]/app.apk'));
      assert.throws(
        () => appUrlRules.assertUrlAllowed(url('http://10.1.2.3/app.apk')),
        /is not allowed by the server configuration/,
      );
      assert.throws(
        () => appUrlRules.assertUrlAllowed(url('http://192.0.2.1/app.apk')),
        /is not allowed by the server configuration/,
      );
    });
  });

  describe('assertRequestAllowed()', function () {
    const requestOpts: AxiosRequestConfig = {url: 'http://localhost/app.apk', responseType: 'stream'};

    it('should return the request options for chaining', function () {
      assert.strictEqual(appUrlRules.assertRequestAllowed(requestOpts), requestOpts);
      appUrlRules.configure({deny: ['*.evil.com']});
      assert.strictEqual(appUrlRules.assertRequestAllowed(requestOpts), requestOpts);
    });

    it('should validate the request URL', function () {
      appUrlRules.configure({httpsOnly: true});
      assert.throws(() => appUrlRules.assertRequestAllowed(requestOpts), /is not allowed by the server configuration/);
      assert.throws(
        () => appUrlRules.assertRequestAllowed({url: '/app.apk', baseURL: 'http://localhost'}),
        /is not allowed by the server configuration/,
      );
      appUrlRules.assertRequestAllowed({url: '/app.apk', baseURL: 'https://localhost'});
    });

    describe('with an HTTP proxy', function () {
      const env = {...process.env};

      afterEach(function () {
        for (const key of Object.keys(process.env)) {
          if (!(key in env)) {
            delete process.env[key];
          }
        }
        Object.assign(process.env, env);
      });

      it('should reject a proxied request if address rules are configured', function () {
        appUrlRules.configure({deny: ['127.0.0.0/8', '::1']});
        appUrlRules.assertRequestAllowed({url: 'http://example.com/app.apk'});
        process.env.HTTP_PROXY = 'http://user:pass@proxy.example.com:8080';
        delete process.env.NO_PROXY;
        delete process.env.no_proxy;
        assert.throws(
          () => appUrlRules.assertRequestAllowed({url: 'http://example.com/app.apk'}),
          (e: Error) => e.message.includes(NOT_ALLOWED) && !e.message.includes('pass'),
        );
        // an explicitly configured proxy takes precedence over the environment
        assert.throws(
          () =>
            appUrlRules.assertRequestAllowed({
              url: 'http://example.com/app.apk',
              proxy: {host: 'other.proxy', port: 3128},
            }),
          /is not allowed by the server configuration/,
        );
        // the environment is ignored if the proxy is explicitly disabled
        appUrlRules.assertRequestAllowed({url: 'http://example.com/app.apk', proxy: false});
        // hosts excluded from proxying are fine
        process.env.NO_PROXY = 'example.com';
        appUrlRules.assertRequestAllowed({url: 'http://example.com/app.apk'});
      });

      it('should ignore npm_config_* variables like the HTTP client does', function () {
        // proxy-from-env@2 (used by axios) no longer reads npm_config_no_proxy/npm_config_proxy,
        // so they must not affect whether a request is considered proxied either
        appUrlRules.configure({deny: ['127.0.0.0/8']});
        process.env.HTTP_PROXY = 'http://proxy.example.com:8080';
        delete process.env.NO_PROXY;
        delete process.env.no_proxy;
        process.env.npm_config_no_proxy = '*';
        assert.throws(
          () => appUrlRules.assertRequestAllowed({url: 'http://example.com/app.apk'}),
          /is not allowed by the server configuration/,
        );
        delete process.env.npm_config_no_proxy;
        delete process.env.HTTP_PROXY;
        process.env.npm_config_proxy = 'http://proxy.example.com:8080';
        process.env.npm_config_http_proxy = 'http://proxy.example.com:8080';
        appUrlRules.assertRequestAllowed({url: 'http://example.com/app.apk'});
      });

      it('should reject a proxied redirect if address rules are configured', function () {
        appUrlRules.configure({deny: ['127.0.0.0/8']});
        process.env.HTTP_PROXY = 'http://proxy.example.com:8080';
        process.env.NO_PROXY = 'example.com';
        const result = appUrlRules.applyToRequest({url: 'http://example.com/app.apk'});
        result.beforeRedirect!({href: 'http://example.com/other.apk'}, {} as any, {} as any);
        assert.throws(
          () => result.beforeRedirect!({href: 'http://example.net/app.apk'}, {} as any, {} as any),
          /is not allowed by the server configuration/,
        );
      });

      it('should allow a proxied request if only hostname rules are configured', function () {
        appUrlRules.configure({allow: ['*.example.com'], httpsOnly: true});
        process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';
        delete process.env.NO_PROXY;
        delete process.env.no_proxy;
        appUrlRules.assertRequestAllowed({url: 'https://apps.example.com/app.apk'});
        // the proxy hostname is resolved instead of the destination, so no lookup must be installed
        const result = appUrlRules.applyToRequest({url: 'https://apps.example.com/app.apk'});
        assert.strictEqual(result.lookup, undefined);
        assert.throws(
          () => appUrlRules.assertRequestAllowed({url: 'https://apps.example.net/app.apk'}),
          /is not allowed by the server configuration/,
        );
      });
    });
  });

  describe('applyToRequest()', function () {
    const requestOpts: AxiosRequestConfig = {url: 'http://localhost/app.apk', responseType: 'stream'};

    it('should return the request options unchanged if no rules are set', function () {
      assert.strictEqual(appUrlRules.applyToRequest(requestOpts), requestOpts);
    });

    it('should not validate the request URL itself', function () {
      appUrlRules.configure({httpsOnly: true});
      assert.notStrictEqual(appUrlRules.applyToRequest(requestOpts), requestOpts);
    });

    it('should apply maxRedirects and validate redirect targets', function () {
      appUrlRules.configure({deny: ['*.evil.com'], maxRedirects: 3});
      const result = appUrlRules.applyToRequest(requestOpts);
      assert.notStrictEqual(result, requestOpts);
      assert.strictEqual(result.responseType, 'stream');
      assert.strictEqual(result.maxRedirects, 3);
      assert.strictEqual(result.lookup, undefined);
      assert.strictEqual(typeof result.beforeRedirect, 'function');
      result.beforeRedirect!({href: 'http://localhost/other.apk'}, {} as any, {} as any);
      assert.throws(
        () => result.beforeRedirect!({href: 'http://app.evil.com/app.apk'}, {} as any, {} as any),
        /is not allowed by the server configuration/,
      );
      // the target may also be given as separate fields
      result.beforeRedirect!(
        {protocol: 'http:', hostname: 'localhost', port: '8080', path: '/a.apk'},
        {} as any,
        {} as any,
      );
      assert.throws(
        () =>
          result.beforeRedirect!({protocol: 'http:', hostname: 'app.evil.com', path: '/a.apk'}, {} as any, {} as any),
        /is not allowed by the server configuration/,
      );
      // a redirect whose target cannot be determined is rejected
      assert.throws(() => result.beforeRedirect!({}, {} as any, {} as any), /cannot be determined/);
    });

    it('should call a previously set beforeRedirect hook', function () {
      appUrlRules.configure({httpsOnly: true});
      const calls: string[] = [];
      const result = appUrlRules.applyToRequest({
        url: 'https://example.com/app.apk',
        beforeRedirect: (opts) => calls.push(opts.href),
      });
      result.beforeRedirect!({href: 'https://example.com/other.apk'}, {} as any, {} as any);
      assert.deepStrictEqual(calls, ['https://example.com/other.apk']);
      assert.throws(
        () => result.beforeRedirect!({href: 'http://example.com/other.apk'}, {} as any, {} as any),
        /is not allowed by the server configuration/,
      );
      assert.strictEqual(calls.length, 1);
    });

    it('should not set maxRedirects if not configured', function () {
      appUrlRules.configure({httpsOnly: true});
      const result = appUrlRules.applyToRequest({url: 'https://example.com/app.apk'});
      assert.strictEqual(result.maxRedirects, undefined);
      assert.strictEqual(result.lookup, undefined);
    });

    it('should validate dynamically resolved addresses in a callback-based lookup', async function () {
      appUrlRules.configure({allow: ['127.0.0.0/8']});
      const lookup = getLookup(appUrlRules.applyToRequest(requestOpts));
      const addresses = (await lookup('localhost', {family: 4, all: true})) as LookupAddress[];
      assert.ok(addresses.length > 0);
      assert.ok(addresses.every(({address}) => address.startsWith('127.')));
      assert.strictEqual(await lookup('localhost', {family: 4}), addresses[0].address);

      appUrlRules.configure({deny: ['127.0.0.0/8']});
      const deniedLookup = getLookup(appUrlRules.applyToRequest(requestOpts));
      await assert.rejects(
        deniedLookup('localhost', {family: 4}),
        /The application host 'localhost' is not allowed by the server configuration/,
      );
    });
  });
});
