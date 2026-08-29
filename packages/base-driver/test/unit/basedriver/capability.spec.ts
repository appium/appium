import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'node:test';

import type {Constraints, InitialOpts, W3CCapabilities} from '@appium/types';
import {asyncmap} from 'asyncbox';
import {createSandbox} from 'sinon';

import {validator} from '../../../lib/basedriver/validation.js';
import {BaseDriver, errors} from '../../../lib/index.js';

// TODO: we need module-level mocks for the logger

/** W3C caps for createSession (tests use partial/invalid caps) */
type TestW3CCaps = W3CCapabilities<Constraints>;

describe('Desired Capabilities', function () {
  let d: BaseDriver<any, any, any, any, any, any>;
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

  it('should require platformName and deviceName', async function () {
    await assert.rejects(
      d.createSession({
        alwaysMatch: {},
        firstMatch: [{}],
      }),
      {name: 'SessionNotCreatedError', message: /platformName/},
    );
  });

  it('should require platformName', async function () {
    await assert.rejects(
      d.createSession({
        alwaysMatch: {},
        firstMatch: [{}],
      }),
      {name: 'SessionNotCreatedError', message: /platformName/},
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
      {name: 'SessionNotCreatedError', message: /necessary.*proper/},
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
      {name: 'SessionNotCreatedError', message: /platformName/},
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
      {name: 'SessionNotCreatedError', message: /platformName/},
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

    it('should allow a string "true" in string capabilities', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:language': 'true'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      assert.strictEqual(logWarnSpy.called, false);

      const sessionCaps = await d.getAppiumSessionCapabilities();
      assert.strictEqual((sessionCaps.capabilities as Record<string, unknown>).language, 'true');
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

    it('should allow a string "1" in string capabilities', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:language': '1'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      assert.strictEqual(logWarnSpy.called, false);

      const sessionCaps = await d.getAppiumSessionCapabilities();
      assert.strictEqual((sessionCaps.capabilities as Record<string, unknown>).language, '1');
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
      {name: 'SessionNotCreatedError', message: /platformName/i},
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
        assert.rejects(d.createSession(val as unknown as TestW3CCaps), errors.SessionNotCreatedError),
      );
    });
  });
});
