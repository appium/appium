import {expect} from 'chai';
import {describe, it} from 'node:test';
import {BasePlugin} from '../../lib/plugin';

describe('base plugin', function () {
  it('should exist', function () {
    expect(BasePlugin).to.exist;
  });

  it('should define its name', function () {
    const p = new BasePlugin('foo');
    expect(p.name).to.eql('foo');
  });

  it('should create a logger', function () {
    const p = new BasePlugin('foo');
    expect(p.log).to.exist;
  });

  it('should define a default list of no new methods', function () {
    expect(BasePlugin.newMethodMap).to.eql({});
  });
});
