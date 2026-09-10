import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'node:test';

import {
  assertAppUrlAllowed,
  compileAppUrlRules,
  getAppUrlRules,
  setAppUrlRules,
} from '../../../lib/basedriver/app-url-rules.js';

describe('app-url-rules', function () {
  afterEach(function () {
    setAppUrlRules();
  });

  describe('compileAppUrlRules()', function () {
    it('should apply defaults for missing rules', function () {
      const rules = compileAppUrlRules({});
      assert.deepStrictEqual(rules, {allow: [], deny: [], httpsOnly: false, allowCredentials: true});
    });

    it('should compile regular expressions', function () {
      const rules = compileAppUrlRules({allow: ['^https://a\\.b/'], deny: ['evil']});
      assert.strictEqual(rules.allow.length, 1);
      assert.ok(rules.allow[0] instanceof RegExp);
      assert.ok(rules.deny[0].test('https://evil.com/app.apk'));
    });

    it('should reject an invalid regular expression', function () {
      assert.throws(() => compileAppUrlRules({allow: ['(']}), /invalid regular expression/);
    });

    it('should reject non-array patterns', function () {
      assert.throws(() => compileAppUrlRules({deny: 'evil' as unknown as string[]}), /must be an array of strings/);
    });

    it('should reject non-boolean flags', function () {
      assert.throws(() => compileAppUrlRules({httpsOnly: 'yes' as unknown as boolean}), /must be a boolean/);
    });

    it('should reject an invalid maxRedirects value', function () {
      assert.throws(() => compileAppUrlRules({maxRedirects: -1}), /non-negative integer/);
      assert.throws(() => compileAppUrlRules({maxRedirects: 1.5}), /non-negative integer/);
    });

    it('should reject non-object rules', function () {
      assert.throws(() => compileAppUrlRules([] as unknown as Record<string, never>), /plain object/);
    });
  });

  describe('setAppUrlRules() / getAppUrlRules()', function () {
    it('should not set any rules by default', function () {
      assert.strictEqual(getAppUrlRules(), undefined);
    });

    it('should set and reset the rules', function () {
      setAppUrlRules({httpsOnly: true, maxRedirects: 0});
      assert.deepStrictEqual(getAppUrlRules(), {
        allow: [],
        deny: [],
        httpsOnly: true,
        allowCredentials: true,
        maxRedirects: 0,
      });
      setAppUrlRules(null);
      assert.strictEqual(getAppUrlRules(), undefined);
    });

    it('should treat empty rules as no rules', function () {
      setAppUrlRules({});
      assert.strictEqual(getAppUrlRules(), undefined);
    });
  });

  describe('assertAppUrlAllowed()', function () {
    const url = (s: string) => new URL(s);

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

    it('should enforce deny rules', function () {
      const rules = compileAppUrlRules({deny: ['^https?://evil\\.']});
      assertAppUrlAllowed(url('https://example.com/app.apk'), rules);
      assert.throws(() => assertAppUrlAllowed(url('https://evil.com/app.apk'), rules), /matches a deny rule/);
    });

    it('should enforce allow rules', function () {
      const rules = compileAppUrlRules({allow: ['^https://a\\.example\\.com/', '^https://b\\.example\\.com/']});
      assertAppUrlAllowed(url('https://a.example.com/app.apk'), rules);
      assertAppUrlAllowed(url('https://b.example.com/app.apk'), rules);
      assert.throws(
        () => assertAppUrlAllowed(url('https://c.example.com/app.apk'), rules),
        /does not match any allow rule/,
      );
    });

    it('should apply deny rules before allow rules', function () {
      const rules = compileAppUrlRules({allow: ['^https://example\\.com/'], deny: ['/private/']});
      assertAppUrlAllowed(url('https://example.com/public/app.apk'), rules);
      assert.throws(
        () => assertAppUrlAllowed(url('https://example.com/private/app.apk'), rules),
        /matches a deny rule/,
      );
    });

    it('should use the globally set rules by default', function () {
      setAppUrlRules({httpsOnly: true});
      assert.throws(() => assertAppUrlAllowed(url('http://example.com/app.apk')), /only https: URLs/);
    });
  });
});
