import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {inspect} from 'node:util';

import type {Constraints, InitialOpts, W3CCapabilities} from '@appium/types';
import {asyncmap} from 'asyncbox';
import {createSandbox} from 'sinon';

import {validator} from '../../../lib/basedriver/validation.js';
import {BaseDriver, errors, getResponseForW3CError} from '../../../lib/index.js';

/** W3C caps for createSession (tests use partial/invalid caps) */
type TestW3CCaps = W3CCapabilities<Constraints>;

describe('Desired Capabilities', function () {
  let d: BaseDriver<any, any, any, any, any>;
  let sandbox: sinon.SinonSandbox;
  let logWarnSpy: sinon.SinonSpy;
  let deprecatedStub: sinon.SinonStub;

  beforeEach(function () {
    d = new BaseDriver({} as InitialOpts);
    sandbox = createSandbox();
    logWarnSpy = sandbox.spy(d.log, 'warn');
    deprecatedStub = sandbox.stub((validator as any)._validators, 'deprecated');
  });

  afterEach(function () {
    sandbox.restore();
    d.deleteSession();
  });

  for (const caps of [
    null,
    [],
    {alwaysMatch: []},
    {firstMatch: []},
    {firstMatch: [null]},
    {alwaysMatch: {platformName: 'iOS'}, firstMatch: [{platformName: 'iOS'}]},
  ]) {
    it(`should report invalid argument without creating a session for ${JSON.stringify(caps)}`, async function () {
      await assert.rejects(d.createSession(caps as unknown as TestW3CCaps), (error) => {
        const [status, body] = getResponseForW3CError(error);
        assert.equal(status, 400);
        assert.equal(body.value.error, 'invalid argument');
        return true;
      });
      assert.equal(d.sessionId, null);
    });
  }

  it('should retain session not created when a session is already active', async function () {
    d.sessionId = 'existing';
    await assert.rejects(d.createSession({alwaysMatch: {platformName: 'iOS'}}), errors.SessionNotCreatedError);
    assert.equal(d.sessionId, 'existing');
  });

  describe('initial timeouts', function () {
    for (const timeouts of [
      undefined,
      null,
      {},
      {script: 123, pageLoad: 456, implicit: 789},
      {implicit: 0},
      {script: null, pageLoad: null, implicit: null},
      {script: Number.MAX_SAFE_INTEGER},
      {implicit: 100, command: 1, unknown: 'ignored'},
    ]) {
      it(`should initialize standard timeout state from ${JSON.stringify(timeouts)}`, async function () {
        const before = await d.getTimeouts();
        const caps = {alwaysMatch: {platformName: 'iOS', timeouts, 'appium:newCommandTimeout': 42}};
        const original = structuredClone(caps);
        // Concrete drivers may only implement remote setters after super.createSession.
        sandbox.stub(d, 'timeouts').rejects(new Error('Backend has not started'));
        sandbox.stub(d, 'setScriptTimeout').throws(new Error('Backend has not started'));
        sandbox.stub(d, 'setPageLoadTimeout').throws(new Error('Backend has not started'));
        sandbox.stub(d, 'setImplicitWait').throws(new Error('Backend has not started'));
        await d.createSession(caps as unknown as TestW3CCaps);
        const expected = {...before, command: 42000};
        for (const name of ['script', 'pageLoad', 'implicit'] as const) {
          if (timeouts?.[name] !== undefined) {
            expected[name] = timeouts[name];
          }
        }
        assert.deepStrictEqual(await d.getTimeouts(), expected);
        assert.deepStrictEqual(caps, original);
      });
    }

    for (const name of ['script', 'pageLoad', 'implicit']) {
      for (const value of ['100', true, [], {}, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        it(`should reject initial ${name}=${JSON.stringify(value)} without creating a session or changing state`, async function () {
          const before = await d.getTimeouts();
          await assert.rejects(
            d.createSession({
              alwaysMatch: {
                platformName: 'iOS',
                timeouts: {script: 100, pageLoad: 200, implicit: 300, [name]: value},
              },
            } as unknown as TestW3CCaps),
            (error) => {
              const [status, body] = getResponseForW3CError(error);
              assert.equal(status, 400);
              assert.equal(body.value.error, 'invalid argument');
              assert.equal(
                body.value.message,
                `Invalid ${name} timeout value ${inspect(value)}: expected null or a non-negative safe integer`,
              );
              return true;
            },
          );
          assert.equal(d.sessionId, null);
          assert.deepStrictEqual(await d.getTimeouts(), before);
        });
      }
    }

    for (const timeouts of [[], '100', 100, true]) {
      it(`should reject a non-object initial timeouts capability: ${JSON.stringify(timeouts)}`, async function () {
        await assert.rejects(
          d.createSession({alwaysMatch: {platformName: 'iOS', timeouts}} as unknown as TestW3CCaps),
          errors.InvalidArgumentError,
        );
        assert.equal(d.sessionId, null);
      });
    }

    it('should apply timeouts from the selected firstMatch candidate', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS'},
        firstMatch: [{timeouts: {implicit: 123}}, {timeouts: {implicit: 456}}],
      });
      assert.equal((await d.getTimeouts()).implicit, 123);
    });
  });

  it('should require platformName and deviceName', async function () {
    await assert.rejects(
      d.createSession({
        alwaysMatch: {},
        firstMatch: [{}],
      }),
      {name: 'InvalidArgumentError', message: /platformName/},
    );
  });

  it('should require platformName', async function () {
    await assert.rejects(
      d.createSession({
        alwaysMatch: {},
        firstMatch: [{}],
      }),
      {name: 'InvalidArgumentError', message: /platformName/},
    );
  });

  it('should not care about cap order', async function () {
    await assert.doesNotReject(
      d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
        },
        firstMatch: [{}],
      }),
    );
  });

  it('should check required caps which are added to driver', async function () {
    d.desiredCapConstraints = {
      necessary: {presence: true},
      proper: {
        presence: true,
        isString: true,
        inclusion: ['Delorean', 'Reventon'],
      },
    } as Constraints;

    await assert.rejects(
      d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
        },
        firstMatch: [{}],
      }),
      {name: 'InvalidArgumentError', message: /necessary.*proper/},
    );
  });

  it('should check added required caps in addition to base', async function () {
    d.desiredCapConstraints = {
      necessary: {presence: true},
      proper: {
        presence: true,
        isString: true,
        inclusion: ['Delorean', 'Reventon'],
      },
    } as Constraints;

    await assert.rejects(
      d.createSession({
        alwaysMatch: {
          'appium:necessary': 'yup',
        },
        firstMatch: [{}],
      }),
      {name: 'InvalidArgumentError', message: /platformName/},
    );
  });

  it('should accept extra capabilities', async function () {
    await assert.doesNotReject(
      d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:extra': 'cheese',
          'appium:hold the': 'sauce',
        },
        firstMatch: [{}],
      }),
    );
  });

  it('should log the use of extra caps', {timeout: 500}, async function () {
    await d.createSession({
      alwaysMatch: {
        platformName: 'iOS',
        'appium:extra': 'cheese',
        'appium:hold the': 'sauce',
      },
      firstMatch: [{}],
    });

    assert.strictEqual(logWarnSpy.called, true);
  });

  it('should suggest a close known capability name for unknown caps', {timeout: 500}, async function () {
    await d.createSession({
      alwaysMatch: {
        platformName: 'iOS',
        'appium:noReest': true,
      },
      firstMatch: [{}],
    } as unknown as TestW3CCaps);

    assert.strictEqual(logWarnSpy.calledWith(`  noReest (did you mean 'noReset'?)`), true);
  });

  it(
    'should not suggest a capability name when the closest match exceeds the edit-distance threshold',
    {timeout: 500},
    async function () {
      await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:qqqqqq': true,
        },
        firstMatch: [{}],
      } as unknown as TestW3CCaps);

      assert.strictEqual(logWarnSpy.calledWith(`  qqqqqq (did you mean`), false);
      assert.strictEqual(logWarnSpy.calledWith(`  qqqqqq`), true);
    },
  );

  it('should be sensitive to the case of caps', async function () {
    await assert.rejects(
      d.createSession({
        alwaysMatch: {platformname: 'iOS'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps),
      {name: 'InvalidArgumentError', message: /vendor prefix.*platformname/},
    );
  });

  describe('boolean capabilities', function () {
    it('should allow a string "false"', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:noReset': 'false'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      assert.strictEqual(logWarnSpy.called, true);

      const sessionCaps = await d.getAppiumSessionCapabilities();
      assert.strictEqual((sessionCaps.capabilities as Record<string, unknown>).noReset, false);
    });

    it('should allow a string "true"', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:noReset': 'true'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      assert.strictEqual(logWarnSpy.called, true);

      const sessionCaps = await d.getAppiumSessionCapabilities();
      assert.strictEqual((sessionCaps.capabilities as Record<string, unknown>).noReset, true);
    });

    it('should reject noReset and fullReset set together', async function () {
      const originalTimeouts = await d.getTimeouts();
      const originalOpts = d.opts;
      const originalCaps = d.caps;
      await assert.rejects(
        d.createSession({
          alwaysMatch: {
            platformName: 'iOS',
            'appium:noReset': true,
            'appium:fullReset': true,
            timeouts: {script: 100, pageLoad: 200, implicit: 300},
          },
          firstMatch: [{}],
        } as unknown as TestW3CCaps),
        {name: 'SessionNotCreatedError', message: /mutually exclusive/},
      );
      assert.equal(d.sessionId, null);
      assert.deepStrictEqual(await d.getTimeouts(), originalTimeouts);
      assert.strictEqual(d.opts, originalOpts);
      assert.strictEqual(d.caps, originalCaps);
      const [sessionId] = await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:fullReset': true},
      } as unknown as TestW3CCaps);
      assert.equal(d.sessionId, sessionId);
      assert.equal(d.opts.fullReset, true);
      assert.equal(d.opts.noReset, false);
    });

    it('should allow a string "true" in string capabilities', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:platformVersion': 'true'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      assert.strictEqual(logWarnSpy.called, false);

      const sessionCaps = await d.getAppiumSessionCapabilities();
      assert.strictEqual((sessionCaps.capabilities as Record<string, unknown>).platformVersion, 'true');
    });
  });

  describe('number capabilities', function () {
    it('should allow a string "1"', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:newCommandTimeout': '1'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      assert.strictEqual(logWarnSpy.called, true);

      const sessionCaps = await d.getAppiumSessionCapabilities();
      assert.strictEqual((sessionCaps.capabilities as Record<string, unknown>).newCommandTimeout, 1);
    });

    it('should allow a string "1.1"', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:newCommandTimeout': '1.1'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      assert.strictEqual(logWarnSpy.called, true);

      const sessionCaps = await d.getAppiumSessionCapabilities();
      assert.strictEqual((sessionCaps.capabilities as Record<string, unknown>).newCommandTimeout, 1.1);
    });

    it('should keep the default timeout when newCommandTimeout is null', async function () {
      const defaultMs = d.newCommandTimeoutMs;
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:newCommandTimeout': null},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      assert.strictEqual(d.newCommandTimeoutMs, defaultMs);
    });

    it('should keep the default timeout when newCommandTimeout is blank', async function () {
      const defaultMs = d.newCommandTimeoutMs;
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:newCommandTimeout': ''},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      assert.strictEqual(d.newCommandTimeoutMs, defaultMs);
    });

    it('should disable the timeout when newCommandTimeout is 0', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:newCommandTimeout': 0},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      assert.strictEqual(d.newCommandTimeoutMs, 0);
    });

    it('should allow a string "1" in string capabilities', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:platformVersion': '1'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      assert.strictEqual(logWarnSpy.called, false);

      const sessionCaps = await d.getAppiumSessionCapabilities();
      assert.strictEqual((sessionCaps.capabilities as Record<string, unknown>).platformVersion, '1');
    });
  });

  it('should error if objects in caps', async function () {
    await assert.rejects(
      d.createSession({
        alwaysMatch: {
          platformName: {a: 'iOS'},
        } as any,
        firstMatch: [{}],
      }),
      {name: 'InvalidArgumentError', message: /platformName/i},
    );
  });

  it('should check for deprecated caps', {timeout: 500}, async function () {
    d.desiredCapConstraints = {
      'lynx-version': {
        deprecated: true,
      },
    } as any;

    await d.createSession({
      alwaysMatch: {
        platformName: 'iOS',
        'appium:lynx-version': 5,
      },
      firstMatch: [{}],
    });

    assert.strictEqual(deprecatedStub.calledWith(5, true, 'lynx-version'), true);
  });

  it('should not warn if deprecated=false', {timeout: 500}, async function () {
    d.desiredCapConstraints = {
      'lynx-version': {deprecated: false},
    } as Constraints;

    await d.createSession({
      alwaysMatch: {
        platformName: 'iOS',
        'appium:lynx-version': 5,
      },
      firstMatch: [{}],
    });

    assert.strictEqual(logWarnSpy.called, false);
  });

  it('should not validate against null/undefined caps', async function () {
    d.desiredCapConstraints = {foo: {isString: true}} as Constraints;

    try {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:foo': null},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
    } finally {
      await d.deleteSession();
    }

    await assert.rejects(
      d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:foo': 1,
        },
        firstMatch: [{}],
      }),
      /'foo' must be of type string/,
    );

    try {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:foo': undefined},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
    } finally {
      await d.deleteSession();
    }

    try {
      await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:foo': '',
        },
        firstMatch: [{}],
      });
    } finally {
      await d.deleteSession();
    }
  });

  for (const capValue of [null, '', {}, [], ' ']) {
    it(`should still validate ${JSON.stringify(capValue)} whose presence is required`, async function () {
      d.desiredCapConstraints = {foo: {presence: true}} as Constraints;

      await assert.rejects(
        d.createSession({
          alwaysMatch: {platformName: 'iOS', 'appium:foo': capValue},
          firstMatch: [{}],
        } as unknown as TestW3CCaps),
        /(blank|required)/,
      );
    });
  }

  describe('w3c', function () {
    it('should accept w3c capabilities', async function () {
      const [sessionId, caps] = await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
        },
        firstMatch: [{}],
      });
      assert.ok(sessionId);
      assert.deepStrictEqual(caps, {
        platformName: 'iOS',
      });
    });

    it('should raise an error if w3c capabilities is not a plain JSON object', async function () {
      const testValues = [true, 'string', [], 100];
      await asyncmap(testValues, (val) =>
        assert.rejects(d.createSession(val as unknown as TestW3CCaps), errors.InvalidArgumentError),
      );
    });
  });
});
