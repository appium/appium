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
  it('should define no server updates', function () {
    const p = new BasePlugin('foo');
    p.updatesServer.should.eql(false);
  });
  it('should define a default list of no commands handled', function () {
    const p = new BasePlugin('foo');
    p.commands.should.eql(false);
  });
  it('should define a default list of no new methods', function () {
    const p = new BasePlugin('foo');
    p.newMethodMap.should.eql({});
  });
  it('should do nothing by default in the updateServer function', async function () {
    const p = new BasePlugin('foo');
    const app = {};
    const server = {};
    await p.updateServer(app, server);
    app.should.eql({});
    server.should.eql({});
  });
  it('should just run the inner command by default in the handle function', async function () {
    const p = new BasePlugin('foo');
    await p.handle(() => 'wrapped').should.eventually.eql('wrapped');
  });
});
