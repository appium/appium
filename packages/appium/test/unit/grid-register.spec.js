// @ts-check

// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';
import {rewiremock} from '../helpers';

describe('grid-register', function () {
  let sandbox;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('registerNode()', function () {
    /** @type {import('appium/lib/grid-register').default} */
    let registerNode;
    let mocks;

    beforeEach(function () {
      mocks = {
        '@appium/support': {
          fs: {
            readFile: sandbox.stub().resolves('{}'),
          },
          logger: {
            getLogger: sandbox.stub().returns(console),
          },
        },
        axios: sandbox.stub().resolves({data: '', status: 200}),
      };

      ({default: registerNode} = rewiremock.proxy(() => require('../../lib/grid-register'), mocks));
    });

    describe('when provided a path to a config file', function () {
      it('should read the config file', async function () {
        await registerNode('/path/to/config-file.json');
        mocks['@appium/support'].fs.readFile.calledOnceWith(
          '/path/to/config-file.json',
          'utf-8'
        ).should.be.true;
      });

      it('should parse the config file as JSON', async function () {
        const parseSpy = sandbox.spy(JSON, 'parse');
        await registerNode('/path/to/config-file.json');
        parseSpy.calledOnceWith(
          await mocks['@appium/support'].fs.readFile.firstCall.returnValue
        ).should.be.true;
      });

      describe('when the config file is invalid', function () {
        beforeEach(function () {
          mocks['@appium/support'].fs.readFile.resolves('');
        });
        it('should reject', async function () {
          await registerNode('/path/to/config-file.json').should.be.rejected;
        });
      });
    });

    describe('when provided a config object', function () {
      it('should not attempt to read the object as a config file', async function () {
        await registerNode({my: 'config'});
        mocks['@appium/support'].fs.readFile.called.should.be.false;
      });

      it('should not attempt to parse any JSON', async function () {
        const parseSpy = sandbox.spy(JSON, 'parse');
        await registerNode({my: 'config'});
        parseSpy.called.should.be.false;
      });
    });
  });
});
