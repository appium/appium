import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import AppiumSupport from '../../lib//index.js';

const {system, tempDir, util} = AppiumSupport;

// `system`/`tempDir`/`util` are ES module namespace objects (`import * as x from ...`
// under the hood), which per spec have a null prototype, so `instanceof Object` is
// always false for them even though `typeof` is 'object'.
function isObjectLike(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}

describe('index', function () {
  describe('default', function () {
    it('should expose an object', function () {
      assert.ok(AppiumSupport);
      assert.ok(AppiumSupport instanceof Object);
    });
    it('should expose system object', function () {
      assert.ok(AppiumSupport.system);
      assert.ok(isObjectLike(AppiumSupport.system));
    });
    it('should expose tempDir object', function () {
      assert.ok(AppiumSupport.tempDir);
      assert.ok(isObjectLike(AppiumSupport.tempDir));
    });
    it('should expose util object', function () {
      assert.ok(AppiumSupport.util);
      assert.ok(isObjectLike(AppiumSupport.util));
    });
  });

  it('should expose an object as "system" ', function () {
    assert.ok(isObjectLike(system));
  });

  it('should expose an object as "tempDir" ', function () {
    assert.ok(isObjectLike(tempDir));
  });

  it('should expose an object as "util" ', function () {
    assert.ok(isObjectLike(util));
  });
});
