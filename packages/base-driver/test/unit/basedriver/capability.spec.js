// @ts-check

import B from 'bluebird';
import {BaseDriver, errors} from '../../../lib/index';
import {validator} from '../../../lib/basedriver/desired-caps';
// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';

// TODO: we need module-level mocks for the logger

describe('Desired Capabilities', function () {
  /** @type {BaseDriver} */
  let d;
  let sandbox;
  /** @type {import('sinon').SinonSpy} */
  let logWarnSpy;
  /** @type {import('sinon').SinonStub} */
  let deprecatedStub;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });


  beforeEach(function () {
    d = new BaseDriver();
    sandbox = createSandbox();
    logWarnSpy = sandbox.spy(d.log, 'warn');
    deprecatedStub = sandbox.stub(validator.validators, 'deprecated');
  });

  afterEach(function () {
    sandbox.restore();
    d.deleteSession();
  });

  it('should require platformName and deviceName', async function () {
    await d
      .createSession({
        alwaysMatch: {},
        firstMatch: [{}],
      })
      .should.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  it('should require platformName', async function () {
    await d
      .createSession({
        alwaysMatch: {},
        firstMatch: [{}],
      })
      .should.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  it('should not care about cap order', async function () {
    await d.createSession({
      alwaysMatch: {
        platformName: 'iOS',
      },
      firstMatch: [{}],
    }).should.be.fulfilled;
  });

  it('should check required caps which are added to driver', async function () {
    d.desiredCapConstraints = {
      necessary: {
        presence: true,
      },
      proper: {
        presence: true,
        isString: true,
        inclusion: ['Delorean', 'Reventon'],
      },
    };

    await d
      .createSession({
        alwaysMatch: {
          platformName: 'iOS',
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(errors.SessionNotCreatedError, /necessary.*proper/);
  });

  it('should check added required caps in addition to base', async function () {
    d.desiredCapConstraints = /** @type {const} */ ({
      necessary: {
        presence: true,
      },
      proper: {
        presence: true,
        isString: true,
        inclusion: ['Delorean', 'Reventon'],
      },
    });

    await d
      .createSession({
        alwaysMatch: {
          'appium:necessary': 'yup',
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  it('should accept extra capabilities', async function () {
    await d.createSession({
      alwaysMatch: {
        platformName: 'iOS',
        'appium:extra': 'cheese',
        'appium:hold the': 'sauce',
      },
      firstMatch: [{}],
    }).should.be.fulfilled;
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

    logWarnSpy.called.should.be.true;
  });

  it('should be sensitive to the case of caps', async function () {
    await d
      .createSession({
        alwaysMatch: {
          // @ts-expect-error
          platformname: 'iOS',
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  describe('boolean capabilities', function () {
    it('should allow a string "false"', async function () {
      await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          // @ts-expect-error
          'appium:noReset': 'false',
        },
        firstMatch: [{}],
      });
      logWarnSpy.called.should.be.true;

      let sessions = await d.getSessions();
      sessions[0].capabilities.noReset.should.eql(false);
    });

    it('should allow a string "true"', async function () {
      await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          // @ts-expect-error
          'appium:noReset': 'true',
        },
        firstMatch: [{}],
      });
      logWarnSpy.called.should.be.true;

      let sessions = await d.getSessions();
      sessions[0].capabilities.noReset.should.eql(true);
    });

    it('should allow a string "true" in string capabilities', async function () {
      await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:language': 'true',
        },
        firstMatch: [{}],
      });
      logWarnSpy.called.should.be.false;

      let sessions = await d.getSessions();
      sessions[0].capabilities.language.should.eql('true');
    });
  });

  describe('number capabilities', function () {
    it('should allow a string "1"', async function () {
      await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          // @ts-expect-error
          'appium:newCommandTimeout': '1',
        },
        firstMatch: [{}],
      });
      logWarnSpy.called.should.be.true;

      let sessions = await d.getSessions();
      sessions[0].capabilities.newCommandTimeout.should.eql(1);
    });

    it('should allow a string "1.1"', async function () {
      await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          // @ts-expect-error
          'appium:newCommandTimeout': '1.1',
        },
        firstMatch: [{}],
      });
      logWarnSpy.called.should.be.true;

      let sessions = await d.getSessions();
      sessions[0].capabilities.newCommandTimeout.should.eql(1.1);
    });

    it('should allow a string "1" in string capabilities', async function () {
      await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:language': '1',
        },
        firstMatch: [{}],
      });
      logWarnSpy.called.should.be.false;

      let sessions = await d.getSessions();
      sessions[0].capabilities.language.should.eql('1');
    });
  });

  it('should error if objects in caps', async function () {
    await d
      .createSession({
        alwaysMatch: {
          // @ts-expect-error
          platformName: {a: 'iOS'},
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(errors.SessionNotCreatedError, /platformName/i);
  });

  it('should check for deprecated caps', async function () {
    this.timeout(500);

    d.desiredCapConstraints = {
      'lynx-version': {
        deprecated: true,
      },
    };

    await d.createSession({
      alwaysMatch: {
        platformName: 'iOS',
        'appium:lynx-version': 5,
      },
      firstMatch: [{}],
    });

    (deprecatedStub.calledWith(5, true, 'lynx-version')).should.be.true;
  });

  it('should not warn if deprecated=false', async function () {
    this.timeout(500);

    d.desiredCapConstraints = {
      'lynx-version': {
        deprecated: false,
      },
    };

    await d.createSession({
      alwaysMatch: {
        platformName: 'iOS',
        'appium:lynx-version': 5,
      },
      firstMatch: [{}],
    });

    logWarnSpy.called.should.be.false;
  });

  it('should not validate against null/undefined caps', async function () {
    d.desiredCapConstraints = {
      foo: {
        isString: true,
      },
    };

    try {
      await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:foo': null,
        },
        firstMatch: [{}],
      });
    } finally {
      await d.deleteSession();
    }

    await d
      .createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:foo': 1,
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(/'foo' must be of type string/);

    try {
      await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:foo': undefined,
        },
        firstMatch: [{}],
      });
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

  it('should still validate null/undefined/empty caps whose presence is required', async function () {
    d.desiredCapConstraints = {
      foo: {
        presence: true,
      },
    };

    await d
      .createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:foo': null,
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(/blank/);

    await d
      // @ts-expect-error `null` is not actually allowed here
      .createSession(null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:foo': '',
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(/blank/);

    await d
      .createSession({
        firstMatch: [
          {
            platformName: 'iOS',
            'appium:foo': {},
          },
        ],
        alwaysMatch: {},
      })
      .should.be.rejectedWith(/blank/);

    await d
      .createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:foo': [],
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(/blank/);

    await d
      .createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:foo': '  ',
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(/blank/);
  });

  describe('w3c', function () {
    it('should accept w3c capabilities', async function () {
      const [sessionId, caps] = await d.createSession({
        alwaysMatch: {
          platformName: 'iOS',
        },
        firstMatch: [{}],
      });
      sessionId.should.exist;
      caps.should.eql({
        platformName: 'iOS',
      });
    });

    it('should raise an error if w3c capabilities is not a plain JSON object', async function () {
      const testValues = [true, 'string', [], 100];
      // this loop runs in parallel, and does not guarantee all assertions will be made
      await B.map(testValues, (val) =>
        d
          // @ts-expect-error
          .createSession(val)
          .should.be.rejectedWith(errors.SessionNotCreatedError)
      );
    });
  });
});
