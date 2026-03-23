import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';
import type registerNodeType from '../../lib/grid-register';
import {rewiremock} from '../helpers';

/** Mimics `@appium/support` logger so `throw logger.errorWithException(msg)` throws a real `Error`. */
function createStubAppiumLogger(sandbox: SinonSandbox) {
  return {
    error: sandbox.stub(),
    warn: sandbox.stub(),
    debug: sandbox.stub(),
    info: sandbox.stub(),
    errorWithException: sandbox.stub().callsFake((...args: unknown[]) => {
      const first = args[0];
      if (first instanceof Error) {
        return first;
      }
      return new Error(args.map(String).join('\n'));
    }),
  };
}

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
    let registerNode: typeof registerNodeType;
    let mocks: {
      '@appium/support': {
        fs: {readFile: SinonStub};
        logger: {getLogger: SinonStub};
      };
      axios: SinonStub;
    };
    let stubLog: ReturnType<typeof createStubAppiumLogger>;

    beforeEach(function () {
      stubLog = createStubAppiumLogger(sandbox);
      mocks = {
        '@appium/support': {
          fs: {
            readFile: sandbox.stub().resolves('{}'),
          },
          logger: {
            getLogger: sandbox.stub().returns(stubLog),
          },
        },
        axios: sandbox.stub().resolves({data: '', status: 200}),
      };

      ({default: registerNode} = rewiremock.proxy(
        () => require('../../lib/grid-register'),
        mocks
      ) as {default: typeof registerNodeType});
    });

    describe('when provided a path to a config file', function () {
      const binding = {addr: '127.0.0.1', port: 4723, basePath: '' as string};

      it('should read the config file', async function () {
        await registerNode('/path/to/config-file.json', binding.addr, binding.port, binding.basePath);
        expect(
          mocks['@appium/support'].fs.readFile.calledOnceWith(
            '/path/to/config-file.json',
            'utf-8'
          )
        ).to.be.true;
      });

      it('should parse the config file as JSON', async function () {
        const parseSpy = sandbox.spy(JSON, 'parse');
        await registerNode('/path/to/config-file.json', binding.addr, binding.port, binding.basePath);
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
        it('should reject with a JSON parse error from the config file', async function () {
          await expect(
            registerNode('/path/to/config-file.json', binding.addr, binding.port, binding.basePath)
          ).to.be.rejectedWith(Error, /Syntax error in Selenium Grid 3 node configuration file/);
          expect(stubLog.errorWithException.calledOnce).to.be.true;
        });
      });

      describe('when address, port, or basePath are omitted', function () {
        it('should reject when addr is missing', async function () {
          await expect(
            registerNode('/path/to/config-file.json', undefined as unknown as string, 4723, '')
          ).to.be.rejectedWith(
            Error,
            /address, port, and basePath are required \(e\.g\. match your Appium `--address`/
          );
          expect(stubLog.errorWithException.calledOnce).to.be.true;
        });

        it('should reject when port is missing', async function () {
          await expect(
            registerNode('/path/to/config-file.json', '127.0.0.1', undefined as unknown as number, '')
          ).to.be.rejectedWith(
            Error,
            /address, port, and basePath are required \(e\.g\. match your Appium `--address`/
          );
          expect(stubLog.errorWithException.calledOnce).to.be.true;
        });

        it('should reject when basePath is missing', async function () {
          await expect(
            registerNode('/path/to/config-file.json', '127.0.0.1', 4723, undefined as unknown as string)
          ).to.be.rejectedWith(
            Error,
            /address, port, and basePath are required \(e\.g\. match your Appium `--address`/
          );
          expect(stubLog.errorWithException.calledOnce).to.be.true;
        });

        it('should reject when port is not a finite number', async function () {
          await expect(
            registerNode('/path/to/config-file.json', '127.0.0.1', Number.NaN, '')
          ).to.be.rejectedWith(Error, /port must be a finite number/);
          expect(stubLog.errorWithException.calledOnce).to.be.true;
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
