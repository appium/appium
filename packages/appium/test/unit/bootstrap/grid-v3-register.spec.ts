import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach, before, after, mock} from 'node:test';

import {fs} from '@appium/support';
import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';

import type registerNodeType from '../../../lib/bootstrap/grid-v3-register.js';
import {log} from '../../../lib/logger.js';

describe('bootstrap/grid-v3-register', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('registerNode()', function () {
    let registerNode: typeof registerNodeType;
    let readFileStub: SinonStub;
    let axiosStub: SinonStub;
    let loggerSandbox: SinonSandbox;
    let stubLog: {
      error: SinonStub;
      warn: SinonStub;
      debug: SinonStub;
      info: SinonStub;
      errorWithException: SinonStub;
    };

    // `fs`/`log` are plain mutable objects (not frozen ES module namespaces), so their methods
    // are stubbed directly rather than via `mock.module()`. `log` in particular is a
    // process-wide singleton shared with other spec files, so its stubs are restored in
    // `after()` rather than left in place. `axios` genuinely needs `mock.module()` (real ESM,
    // frozen default export); `grid-v3-register.js` isn't loaded elsewhere in this file, so a
    // single fresh import after mocking is enough — no per-test reimport needed.
    before(async function () {
      loggerSandbox = createSandbox();
      readFileStub = loggerSandbox.stub(fs, 'readFile');
      stubLog = {
        error: loggerSandbox.stub(log, 'error'),
        warn: loggerSandbox.stub(log, 'warn'),
        debug: loggerSandbox.stub(log, 'debug'),
        info: loggerSandbox.stub(log, 'info'),
        errorWithException: loggerSandbox.stub(log, 'errorWithException'),
      };
      axiosStub = loggerSandbox.stub();
      mock.module('axios', {defaultExport: axiosStub});
      ({default: registerNode} = await import('../../../lib/bootstrap/grid-v3-register.js'));
    });

    after(function () {
      mock.reset();
      loggerSandbox.restore();
    });

    beforeEach(function () {
      readFileStub.reset();
      readFileStub.resolves('{}');
      axiosStub.reset();
      axiosStub.resolves({data: '', status: 200});
      stubLog.error.reset();
      stubLog.warn.reset();
      stubLog.debug.reset();
      stubLog.info.reset();
      stubLog.errorWithException.reset();
      stubLog.errorWithException.callsFake((...args: unknown[]) => {
        const first = args[0];
        if (first instanceof Error) {
          return first;
        }
        return new Error(args.map(String).join('\n'));
      });
    });

    describe('when provided a path to a config file', function () {
      const binding = {addr: '127.0.0.1', port: 4723, basePath: '' as string};

      it('should read the config file', async function () {
        await registerNode('/path/to/config-file.json', binding.addr, binding.port, binding.basePath);
        assert.strictEqual(readFileStub.calledOnceWith('/path/to/config-file.json', 'utf-8'), true);
      });

      it('should parse the config file as JSON', async function () {
        const parseSpy = sandbox.spy(JSON, 'parse');
        await registerNode('/path/to/config-file.json', binding.addr, binding.port, binding.basePath);
        assert.strictEqual(parseSpy.calledOnceWith(await readFileStub.firstCall.returnValue), true);
      });

      describe('when the config file is invalid', function () {
        beforeEach(function () {
          readFileStub.resolves('');
        });
        it('should reject with a JSON parse error from the config file', async function () {
          await assert.rejects(
            registerNode('/path/to/config-file.json', binding.addr, binding.port, binding.basePath),
            {name: 'Error', message: /Syntax error in Selenium Grid 3 node configuration file/},
          );
          assert.strictEqual(stubLog.errorWithException.calledOnce, true);
        });
      });

      describe('when address, port, or basePath are omitted', function () {
        it('should reject when addr is missing', async function () {
          await assert.rejects(registerNode('/path/to/config-file.json', undefined as unknown as string, 4723, ''), {
            name: 'Error',
            message: /address, port, and basePath are required \(e\.g\. match your Appium `--address`/,
          });
          assert.strictEqual(stubLog.errorWithException.calledOnce, true);
        });

        it('should reject when port is missing', async function () {
          await assert.rejects(
            registerNode('/path/to/config-file.json', '127.0.0.1', undefined as unknown as number, ''),
            {
              name: 'Error',
              message: /address, port, and basePath are required \(e\.g\. match your Appium `--address`/,
            },
          );
          assert.strictEqual(stubLog.errorWithException.calledOnce, true);
        });

        it('should reject when basePath is missing', async function () {
          await assert.rejects(
            registerNode('/path/to/config-file.json', '127.0.0.1', 4723, undefined as unknown as string),
            {
              name: 'Error',
              message: /address, port, and basePath are required \(e\.g\. match your Appium `--address`/,
            },
          );
          assert.strictEqual(stubLog.errorWithException.calledOnce, true);
        });

        it('should reject when port is not a finite number', async function () {
          await assert.rejects(registerNode('/path/to/config-file.json', '127.0.0.1', Number.NaN, ''), {
            name: 'Error',
            message: /port must be a finite number/,
          });
          assert.strictEqual(stubLog.errorWithException.calledOnce, true);
        });
      });
    });

    describe('when provided a config object', function () {
      it('should not attempt to read the object as a config file', async function () {
        await registerNode({my: 'config'});
        assert.strictEqual(readFileStub.called, false);
      });

      it('should not attempt to parse any JSON', async function () {
        const parseSpy = sandbox.spy(JSON, 'parse');
        await registerNode({my: 'config'});
        assert.strictEqual(parseSpy.called, false);
      });

      it('should not hoist inherited properties into configuration', async function () {
        // Faking only what's needed (not sinon's full default set, which includes
        // `setImmediate`/`process.nextTick`/etc.) avoids breaking `node --test`'s own internal
        // scheduling — with the full default set, the test runner silently stops reporting
        // this file's nested subtests (collapses to a single opaque pass/fail for the file).
        const clock = sandbox.useFakeTimers({
          toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
        });
        const config = Object.create({
          hubHost: 'evil.example.com',
          hubPort: 4444,
          hubProtocol: 'http',
        }) as Record<string, unknown>;
        config.capabilities = [];
        config.register = true;
        config.registerCycle = 100;
        await registerNode(config as Parameters<typeof registerNodeType>[0], '127.0.0.1', 4723, '');
        await clock.tickAsync(100);
        assert.strictEqual(axiosStub.calledOnce, true);
        const hubCfg = axiosStub.firstCall.args[0].data.configuration;
        assert.notStrictEqual(hubCfg.hubHost, 'evil.example.com');
        assert.strictEqual(hubCfg.url, 'http://127.0.0.1:4723');
      });
    });
  });
});
