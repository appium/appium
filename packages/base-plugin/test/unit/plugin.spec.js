import {BasePlugin} from '../../lib/plugin';

describe('base plugin', function () {
  let should;

  before(async function () {
    const chai = await import('chai');
    should = chai.should();
  });

  it('should exist', function () {
    should.exist(BasePlugin);
  });
  it('should define its name', function () {
    const p = new BasePlugin('foo');
    p.name.should.eql('foo');
  });
  it('should create a logger', function () {
    const p = new BasePlugin('foo');
    should.exist(p.logger);
  });
  it('should define a default list of no new methods', function () {
    BasePlugin.newMethodMap.should.eql({});
  });
});
