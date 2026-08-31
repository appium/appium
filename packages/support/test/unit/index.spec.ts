import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import AppiumSupport from '../../lib/';

const {system, tempDir, util} = AppiumSupport;

describe('index', function () {
  describe('default', function () {
    it('should expose an object', function () {
      assert.ok(AppiumSupport);
      assert.ok(AppiumSupport instanceof Object);
    });
    it('should expose system object', function () {
      assert.ok(AppiumSupport.system);
      assert.ok(AppiumSupport.system instanceof Object);
    });
    it('should expose tempDir object', function () {
      assert.ok(AppiumSupport.tempDir);
      assert.ok(AppiumSupport.tempDir instanceof Object);
    });
    it('should expose util object', function () {
      assert.ok(AppiumSupport.util);
      assert.ok(AppiumSupport.util instanceof Object);
    });
  });

  it('should expose an object as "system" ', function () {
    assert.ok(system instanceof Object);
  });

  it('should expose an object as "tempDir" ', function () {
    assert.ok(tempDir instanceof Object);
  });

  it('should expose an object as "util" ', function () {
    assert.ok(util instanceof Object);
  });
});
