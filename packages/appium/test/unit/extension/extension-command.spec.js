// @ts-check
import {DriverConfig} from '../../../lib/extension/driver-config';
import {ExtensionCommand} from '../../../lib/cli/extension-command';
import sinon from 'sinon';
import {FAKE_DRIVER_DIR} from '../../helpers';
import {Manifest} from '../../../lib/extension/manifest';

/**
 * Relative path from actual `package.json` of `FakeDriver` for the `fake-stdin` script
 */
const FAKE_STDIN_SCRIPT = require(`${FAKE_DRIVER_DIR}/package.json`).appium.scripts['fake-stdin'];

describe('ExtensionCommand', function () {
  describe('method', function () {
    /** @type {ExtensionCommand} */
    let ec;

    /** @type {sinon.SinonSandbox} */
    let sandbox;

    let expect;

    before(async function () {
      const chai = await import('chai');
      const chaiAsPromised = await import('chai-as-promised');
      chai.use(chaiAsPromised.default);
      chai.should();
      expect = chai.expect;
    });

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      const driverConfig = DriverConfig.create(sandbox.createStubInstance(Manifest));
      ec = new ExtensionCommand({config: driverConfig, json: false});
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('_runUnbuffered()', function () {
      // this test is low value and mostly just asserts that `child_process.spawn()` works.
      // the problem is that because `_run()` returns a `Promise`, a caller cannot reach the
      // underlying `ChildProcess` instance.
      // something like `execa` could work around this because it returns a frankenstein of a
      // `Promise` + `ChildProcess`, but I didn't want to add the dep.
      it('should respond to stdin', function (done) {
        // we have to fake writing to STDIN because this is an automated test, after all.
        const proc = ec
          ._runUnbuffered(FAKE_DRIVER_DIR, FAKE_STDIN_SCRIPT, [], {
            stdio: ['pipe', 'inherit', 'inherit'],
          })
          .once('exit', (code) => {
            try {
              expect(code).to.equal(0);
              done();
            } catch (err) {
              done(err);
            }
          });

        setTimeout(() => {
          // TS does not understand that `proc.stdin` is not `null`, because it is only a `Writable`
          // if STDIN is piped from the parent.
          const stdin = /** @type {import('node:stream').Writable} */ (proc.stdin);
          stdin.write('\n');
          stdin.end();
        }, 200);
      });
    });
  });
});
