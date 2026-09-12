import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'node:test';

import {
  assertAppUrlAllowed,
  compileAppUrlRules,
  configureAppUrlRules,
  createAppUrlLookup,
  getAppUrlRules,
} from '../../../lib/basedriver/commands/app-url-rules.js';
import {DriverCore} from '../../../lib/basedriver/core.js';

const driver = new DriverCore();
const applyAppUrlRules = (rules?: Parameters<typeof configureAppUrlRules>[0] | null) =>
  configureAppUrlRules.call(driver, rules);

describe('app-url-rules', function () {
  afterEach(function () {
    applyAppUrlRules();
  });

  describe('compileAppUrlRules()', function () {
    it('should apply defaults for missing rules', function () {
      const rules = compileAppUrlRules({});
      assert.strictEqual(rules.allow.addressCount, 0);
      assert.strictEqual(rules.allow.hostnames.length, 0);
      assert.strictEqual(rules.deny.addressCount, 0);
      assert.strictEqual(rules.deny.hostnames.length, 0);
      assert.strictEqual(rules.httpsOnly, false);
      assert.strictEqual(rules.allowCredentials, true);
    });

    it('should compile hostname and address rules', function () {
      const rules = compileAppUrlRules({allow: ['*.example.com', '10.0.0.0/8'], deny: ['::1']});
      assert.strictEqual(rules.allow.hostnames.length, 1);
      assert.strictEqual(rules.allow.addressCount, 1);
      assert.strictEqual(rules.deny.addressCount, 1);
    });

    it('should reject an invalid address or subnet', function () {
      assert.throws(() => compileAppUrlRules({allow: ['10.0.0.0/nope']}), /invalid IP address or subnet/);
    });
  });

  describe('configureAppUrlRules() / getAppUrlRules()', function () {
    it('should not set any rules by default', function () {
      assert.strictEqual(getAppUrlRules(), undefined);
    });

    it('should set and reset the rules', function () {
      applyAppUrlRules({httpsOnly: true, maxRedirects: 0});
      assert.strictEqual(getAppUrlRules()?.httpsOnly, true);
      assert.strictEqual(getAppUrlRules()?.maxRedirects, 0);
      applyAppUrlRules(null);
      assert.strictEqual(getAppUrlRules(), undefined);
    });

    it('should treat empty rules as no rules', function () {
      applyAppUrlRules({});
      assert.strictEqual(getAppUrlRules(), undefined);
    });
  });

  describe('assertAppUrlAllowed()', function () {
    const url = (value: string) => new URL(value);

    it('should allow any URL if no rules are set', function () {
      assertAppUrlAllowed(url('http://user:pass@example.com/app.apk'));
    });

    it('should enforce httpsOnly', function () {
      const rules = compileAppUrlRules({httpsOnly: true});
      assertAppUrlAllowed(url('https://example.com/app.apk'), rules);
      assert.throws(() => assertAppUrlAllowed(url('http://example.com/app.apk'), rules), /only https: URLs/);
    });

    it('should enforce allowCredentials', function () {
      const rules = compileAppUrlRules({allowCredentials: false});
      assertAppUrlAllowed(url('https://example.com/app.apk'), rules);
      assert.throws(() => assertAppUrlAllowed(url('https://user@example.com/app.apk'), rules), /credentials/);
      assert.throws(() => assertAppUrlAllowed(url('https://:pass@example.com/app.apk'), rules), /credentials/);
    });

    it('should not include credentials in the error message', function () {
      const rules = compileAppUrlRules({httpsOnly: true});
      assert.throws(
        () => assertAppUrlAllowed(url('http://user:s3cret@example.com/app.apk'), rules),
        (e: Error) => !e.message.includes('s3cret') && e.message.includes("'http://example.com/app.apk'"),
      );
    });

    it('should enforce hostname deny rules', function () {
      const rules = compileAppUrlRules({deny: ['*.evil.com']});
      assertAppUrlAllowed(url('https://example.com/app.apk'), rules);
      assert.throws(() => assertAppUrlAllowed(url('https://app.evil.com/app.apk'), rules), /matches a deny rule/);
    });

    it('should normalize and enforce hostname allow rules', function () {
      const rules = compileAppUrlRules({allow: ['*.example.com', 'münich.example']});
      assertAppUrlAllowed(url('https://a.example.com/app.apk'), rules);
      assertAppUrlAllowed(url('https://B.EXAMPLE.COM./app.apk'), rules);
      assertAppUrlAllowed(url('https://münich.example/app.apk'), rules);
      assert.throws(
        () => assertAppUrlAllowed(url('https://c.example.net/app.apk'), rules),
        /hostname does not match any allow rule/,
      );
    });

    it('should enforce IPv4 and IPv6 address rules', function () {
      const rules = compileAppUrlRules({allow: ['10.0.0.0/8', '2001:db8::/32'], deny: ['10.1.2.3']});
      assertAppUrlAllowed(url('http://10.2.3.4/app.apk'), rules);
      assertAppUrlAllowed(url('http://[2001:db8::1]/app.apk'), rules);
      assert.throws(() => assertAppUrlAllowed(url('http://10.1.2.3/app.apk'), rules), /IP address matches a deny rule/);
      assert.throws(() => assertAppUrlAllowed(url('http://192.0.2.1/app.apk'), rules), /does not match any allow rule/);
    });

    it('should check dynamically resolved addresses', async function () {
      const allowedLookup = createAppUrlLookup(compileAppUrlRules({allow: ['127.0.0.0/8']}));
      const addresses = await allowedLookup('localhost', {family: 4});
      assert.ok(addresses.every(({address}) => address.startsWith('127.')));

      const deniedLookup = createAppUrlLookup(compileAppUrlRules({deny: ['127.0.0.0/8']}));
      await assert.rejects(deniedLookup('localhost', {family: 4}), /resolved IP address matches a deny rule/);
    });

    it('should use the globally set rules by default', function () {
      applyAppUrlRules({httpsOnly: true});
      assert.throws(() => assertAppUrlAllowed(url('http://example.com/app.apk')), /only https: URLs/);
    });
  });
});
