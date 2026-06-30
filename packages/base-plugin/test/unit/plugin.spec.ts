import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BasePlugin } from '../../lib/plugin';

describe('base plugin', function () {
  it('should exist', function () {
    assert.ok(BasePlugin);
  });

  it('should define its name', function () {
    const p = new BasePlugin('foo');
    assert.equal(p.name, 'foo');
  });

  it('should create a logger', function () {
    const p = new BasePlugin('foo');
    assert.ok(p.log);
  });

  it('should define a default list of no new methods', function () {
    assert.deepEqual(BasePlugin.newMethodMap, {});
  });
});
