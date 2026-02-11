import B from 'bluebird';
import type {Constraints, InitialOpts, W3CCapabilities} from '@appium/types';
import {BaseDriver, errors} from '../../../lib/index';
import {validator} from '../../../lib/basedriver/validation';
import {createSandbox} from 'sinon';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

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
    await expect(
      d.createSession({
        alwaysMatch: {},
        firstMatch: [{}],
      })
    ).to.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  it('should require platformName', async function () {
    await expect(
      d.createSession({
        alwaysMatch: {},
        firstMatch: [{}],
      })
    ).to.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  it('should not care about cap order', async function () {
    await expect(
      d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
        },
        firstMatch: [{}],
      })
    ).to.be.fulfilled;
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

    await expect(
      d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
        },
        firstMatch: [{}],
      })
    ).to.be.rejectedWith(errors.SessionNotCreatedError, /necessary.*proper/);
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

    await expect(
      d.createSession({
        alwaysMatch: {
          'appium:necessary': 'yup',
        },
        firstMatch: [{}],
      })
    ).to.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  it('should accept extra capabilities', async function () {
    await expect(
      d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:extra': 'cheese',
          'appium:hold the': 'sauce',
        },
        firstMatch: [{}],
      })
    ).to.be.fulfilled;
  });

  it('should log the use of extra caps', async function () {
    this.timeout(500);

    await d.createSession({
      alwaysMatch: {
        platformName: 'iOS',
        'appium:extra': 'cheese',
        'appium:hold the': 'sauce',
      },
      firstMatch: [{}],
    });

    expect(logWarnSpy.called).to.be.true;
  });

  it('should be sensitive to the case of caps', async function () {
    await expect(
      d.createSession({
        alwaysMatch: {platformname: 'iOS'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps)
    ).to.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  describe('boolean capabilities', function () {
    it('should allow a string "false"', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:noReset': 'false'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      expect(logWarnSpy.called).to.be.true;

      const sessionCaps = await d.getAppiumSessionCapabilities();
      expect((sessionCaps.capabilities as Record<string, unknown>).noReset).to.eql(false);
    });

    it('should allow a string "true"', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:noReset': 'true'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      expect(logWarnSpy.called).to.be.true;

      const sessionCaps = await d.getAppiumSessionCapabilities();
      expect((sessionCaps.capabilities as Record<string, unknown>).noReset).to.eql(true);
    });

    it('should allow a string "true" in string capabilities', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:language': 'true'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      expect(logWarnSpy.called).to.be.false;

      const sessionCaps = await d.getAppiumSessionCapabilities();
      expect((sessionCaps.capabilities as Record<string, unknown>).language).to.eql('true');
    });
  });

  describe('number capabilities', function () {
    it('should allow a string "1"', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:newCommandTimeout': '1'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      expect(logWarnSpy.called).to.be.true;

      const sessionCaps = await d.getAppiumSessionCapabilities();
      expect((sessionCaps.capabilities as Record<string, unknown>).newCommandTimeout).to.eql(1);
    });

    it('should allow a string "1.1"', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:newCommandTimeout': '1.1'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      expect(logWarnSpy.called).to.be.true;

      const sessionCaps = await d.getAppiumSessionCapabilities();
      expect((sessionCaps.capabilities as Record<string, unknown>).newCommandTimeout).to.eql(1.1);
    });

    it('should allow a string "1" in string capabilities', async function () {
      await d.createSession({
        alwaysMatch: {platformName: 'iOS', 'appium:language': '1'},
        firstMatch: [{}],
      } as unknown as TestW3CCaps);
      expect(logWarnSpy.called).to.be.false;

      const sessionCaps = await d.getAppiumSessionCapabilities();
      expect((sessionCaps.capabilities as Record<string, unknown>).language).to.eql('1');
    });
  });

  it('should error if objects in caps', async function () {
    await expect(
      d.createSession({
        alwaysMatch: {
          platformName: {a: 'iOS'},
        } as any,
        firstMatch: [{}],
      })
    ).to.be.rejectedWith(errors.SessionNotCreatedError, /platformName/i);
  });

  it('should check for deprecated caps', async function () {
    this.timeout(500);

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

    expect(deprecatedStub.calledWith(5, true, 'lynx-version')).to.be.true;
  });

  it('should not warn if deprecated=false', async function () {
    this.timeout(500);

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

    expect(logWarnSpy.called).to.be.false;
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

    await expect(
      d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:foo': 1,
        },
        firstMatch: [{}],
      })
    ).to.be.rejectedWith(/'foo' must be of type string/);

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

      await expect(
        d.createSession({
          alwaysMatch: {platformName: 'iOS', 'appium:foo': capValue},
          firstMatch: [{}],
        } as unknown as TestW3CCaps)
      ).to.be.rejectedWith(/(blank|required)/);
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
      expect(sessionId).to.exist;
      expect(caps).to.eql({
        platformName: 'iOS',
      });
    });

    it('should raise an error if w3c capabilities is not a plain JSON object', async function () {
      const testValues = [true, 'string', [], 100];
      await B.map(testValues, (val) =>
        expect(d.createSession(val as unknown as TestW3CCaps)).to.be.rejectedWith(
          errors.SessionNotCreatedError
        )
      );
    });
  });
});
