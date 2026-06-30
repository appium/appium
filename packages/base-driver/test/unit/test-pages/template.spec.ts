import { expect } from 'chai';
import { describe, it } from 'node:test';
import { compileLodashTemplate } from '../../../lib/test-pages/template';

describe('compileLodashTemplate', function () {
  it('should render static text', function () {
    const render = compileLodashTemplate('hello');
    expect(render({})).to.equal('hello');
  });

  it('should interpolate template parameters', function () {
    const render = compileLodashTemplate('Hello <%= message %>!');
    expect(render({ message: 'world' })).to.equal('Hello world!');
  });

  it('should evaluate javascript expressions in templates', function () {
    const render = compileLodashTemplate('<%= one + two %>');
    expect(render({ one: 1, two: 2 })).to.equal('3');
  });

  it('should render multiple interpolations', function () {
    const render = compileLodashTemplate('<%= a %>-<%= b %>');
    expect(render({ a: 'x', b: 'y' })).to.equal('x-y');
  });
});
