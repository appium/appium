import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {compileLodashTemplate} from '../../../lib/test-pages/template.js';

describe('compileLodashTemplate', function () {
  it('should render static text', function () {
    const render = compileLodashTemplate('hello');
    assert.strictEqual(render({}), 'hello');
  });

  it('should interpolate template parameters', function () {
    const render = compileLodashTemplate('Hello <%= message %>!');
    assert.strictEqual(render({message: 'world'}), 'Hello world!');
  });

  it('should evaluate javascript expressions in templates', function () {
    const render = compileLodashTemplate('<%= one + two %>');
    assert.strictEqual(render({one: 1, two: 2}), '3');
  });

  it('should render multiple interpolations', function () {
    const render = compileLodashTemplate('<%= a %>-<%= b %>');
    assert.strictEqual(render({a: 'x', b: 'y'}), 'x-y');
  });
});
