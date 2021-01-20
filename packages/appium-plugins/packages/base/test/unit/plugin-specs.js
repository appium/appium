import BasePlugin from '../../index';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const should = chai.should();

describe('base plugin', function () {
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
  it('should define no server update method', function () {
    const p = new BasePlugin('foo');
    should.not.exist(p.updateServer);
  });
  it('should define a default list of no new methods', function () {
    const p = new BasePlugin('foo');
    p.newMethodMap.should.eql({});
  });
});
