import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createSandbox, type SinonSandbox} from 'sinon';
import {rewiremock} from '../helpers';

type RegisterNodeFn = (
  data: string | object,
  addr?: string,
  port?: number,
  basePath?: string
) => Promise<boolean>;

describe('grid-register', function () {
  let sandbox: SinonSandbox;

  before(async function () {
    use(chaiAsPromised);
  });

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('registerNode()', function () {
    let registerNode: RegisterNodeFn;
    let mocks: {
      '@appium/support': {
        fs: {readFile: import('sinon').SinonStub};
        logger: {getLogger: import('sinon').SinonStub};
      };
      axios: import('sinon').SinonStub;
    };

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

      ({default: registerNode} = rewiremock.proxy(
        () => require('../../lib/grid-register'),
        mocks
      ) as {default: RegisterNodeFn});
    });

    describe('when provided a path to a config file', function () {
      it('should read the config file', async function () {
        await registerNode('/path/to/config-file.json');
        expect(
          mocks['@appium/support'].fs.readFile.calledOnceWith(
            '/path/to/config-file.json',
            'utf-8'
          )
        ).to.be.true;
      });

      it('should parse the config file as JSON', async function () {
        const parseSpy = sandbox.spy(JSON, 'parse');
        await registerNode('/path/to/config-file.json');
        expect(
          parseSpy.calledOnceWith(
            await mocks['@appium/support'].fs.readFile.firstCall.returnValue
          )
        ).to.be.true;
      });

      describe('when the config file is invalid', function () {
        beforeEach(function () {
          mocks['@appium/support'].fs.readFile.resolves('');
        });
        it('should reject', async function () {
          await expect(registerNode('/path/to/config-file.json')).to.be.rejected;
        });
      });
    });

    describe('when provided a config object', function () {
      it('should not attempt to read the object as a config file', async function () {
        await registerNode({my: 'config'});
        expect(mocks['@appium/support'].fs.readFile.called).to.be.false;
      });

      it('should not attempt to parse any JSON', async function () {
        const parseSpy = sandbox.spy(JSON, 'parse');
        await registerNode({my: 'config'});
        expect(parseSpy.called).to.be.false;
      });
    });
  });
});
