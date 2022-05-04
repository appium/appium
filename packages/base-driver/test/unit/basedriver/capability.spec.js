// @ts-check

import B from 'bluebird';
import {BaseDriver, errors} from '../../../lib';
import {validator} from '../../../lib/basedriver/desired-caps';
import {createSandbox} from 'sinon';

// TODO: we need module-level mocks for the logger

describe('Desired Capabilities', function () {
  /** @type {BaseDriver} */
  let d;
  let sandbox;

  beforeEach(function () {
    d = new BaseDriver();
    sandbox = createSandbox();
    sandbox.spy(d.log, 'warn');
    sandbox.stub(validator.validators, 'deprecated');
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
        alwaysMatch: {
          'appium:deviceName': 'Delorean',
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  it('should not care about cap order', async function () {
    await d.createSession(null, null, {
      alwaysMatch: {
        'appium:deviceName': 'Delorean',
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
      .createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Delorean',
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(errors.SessionNotCreatedError, /necessary.*proper/);
  });

  it('should check added required caps in addition to base', async function () {
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
      .createSession(null, null, {
        alwaysMatch: {
          'appium:necessary': 'yup',
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  it('should accept extra capabilities', async function () {
    await d.createSession(null, null, {
      alwaysMatch: {
        platformName: 'iOS',
        'appium:deviceName': 'Delorean',
        'appium:extra': 'cheese',
        'appium:hold the': 'sauce',
      },
      firstMatch: [{}],
    }).should.be.fulfilled;
  });

  it('should log the use of extra caps', async function () {
    this.timeout(500);

    await d.createSession(null, null, {
      alwaysMatch: {
        platformName: 'iOS',
        'appium:deviceName': 'Delorean',
        'appium:extra': 'cheese',
        'appium:hold the': 'sauce',
      },
      firstMatch: [{}],
    });

    d.log.warn.should.have.been.called;
  });

  it('should be sensitive to the case of caps', async function () {
    await d
      .createSession(null, null, {
        alwaysMatch: {
          // @ts-expect-error
          platformname: 'iOS',
          'appium:deviceName': 'Delorean',
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  describe('boolean capabilities', function () {
    it('should allow a string "false"', async function () {
      await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Delorean',
          // @ts-expect-error
          'appium:noReset': 'false',
        },
        firstMatch: [{}],
      });
      d.log.warn.should.have.been.called;

      let sessions = await d.getSessions();
      sessions[0].capabilities.noReset.should.eql(false);
    });

    it('should allow a string "true"', async function () {
      await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Delorean',
          // @ts-expect-error
          'appium:noReset': 'true',
        },
        firstMatch: [{}],
      });
      d.log.warn.should.have.been.called;

      let sessions = await d.getSessions();
      sessions[0].capabilities.noReset.should.eql(true);
    });

    it('should allow a string "true" in string capabilities', async function () {
      await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Delorean',
          'appium:language': 'true',
        },
        firstMatch: [{}],
      });
      d.log.warn.should.not.have.been.called;

      let sessions = await d.getSessions();
      sessions[0].capabilities.language.should.eql('true');
    });
  });

  describe('number capabilities', function () {
    it('should allow a string "1"', async function () {
      await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Delorean',
          // @ts-expect-error
          'appium:newCommandTimeout': '1',
        },
        firstMatch: [{}],
      });
      d.log.warn.should.have.been.called;

      let sessions = await d.getSessions();
      sessions[0].capabilities.newCommandTimeout.should.eql(1);
    });

    it('should allow a string "1.1"', async function () {
      await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Delorean',
          // @ts-expect-error
          'appium:newCommandTimeout': '1.1',
        },
        firstMatch: [{}],
      });
      d.log.warn.should.have.been.called;

      let sessions = await d.getSessions();
      sessions[0].capabilities.newCommandTimeout.should.eql(1.1);
    });

    it('should allow a string "1" in string capabilities', async function () {
      await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Delorean',
          'appium:language': '1',
        },
        firstMatch: [{}],
      });
      d.log.warn.should.not.have.been.called;

      let sessions = await d.getSessions();
      sessions[0].capabilities.language.should.eql('1');
    });
  });

  it('should error if objects in caps', async function () {
    await d
      .createSession(null, null, {
        alwaysMatch: {
          // @ts-expect-error
          platformName: {a: 'iOS'},
          'appium:deviceName': 'Delorean',
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

    await d.createSession(null, null, {
      alwaysMatch: {
        platformName: 'iOS',
        'appium:deviceName': 'Delorean',
        'appium:lynx-version': 5,
      },
      firstMatch: [{}],
    });

    validator.validators.deprecated.should.have.been.calledWith(5, true, 'lynx-version');
  });

  it('should not warn if deprecated=false', async function () {
    this.timeout(500);

    d.desiredCapConstraints = {
      'lynx-version': {
        deprecated: false,
      },
    };

    await d.createSession(null, null, {
      alwaysMatch: {
        platformName: 'iOS',
        'appium:deviceName': 'Delorean',
        'appium:lynx-version': 5,
      },
      firstMatch: [{}],
    });

    d.log.warn.should.not.have.been.called;
  });

  it('should not validate against null/undefined caps', async function () {
    d.desiredCapConstraints = {
      foo: {
        isString: true,
      },
    };

    try {
      await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Dumb',
          'appium:foo': null,
        },
        firstMatch: [{}],
      });
    } finally {
      await d.deleteSession();
    }

    await d
      .createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Dumb',
          'appium:foo': 1,
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(/'foo' must be of type string/);

    try {
      await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Dumb',
          'appium:foo': undefined,
        },
        firstMatch: [{}],
      });
    } finally {
      await d.deleteSession();
    }

    try {
      await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Dumb',
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
      .createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Dumb',
          'appium:foo': null,
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(/blank/);

    await d
      .createSession(null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Dumb',
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
            'appium:deviceName': 'Dumb',
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
          'appium:deviceName': 'Dumb',
          'appium:foo': [],
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(/blank/);

    await d
      .createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Dumb',
          'appium:foo': '  ',
        },
        firstMatch: [{}],
      })
      .should.be.rejectedWith(/blank/);
  });

  describe('w3c', function () {
    it('should accept w3c capabilities', async function () {
      const [sessionId, caps] = await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Delorean',
        },
        firstMatch: [{}],
      });
      sessionId.should.exist;
      caps.should.eql({
        platformName: 'iOS',
        deviceName: 'Delorean',
      });
    });

    it('should raise an error if w3c capabilities is not a plain JSON object', async function () {
      const testValues = [true, 'string', [], 100];
      // this loop runs in parallel, and does not guarantee all assertions will be made
      await B.map(testValues, (val) =>
        d
          // @ts-expect-error
          .createSession(null, null, val)
          .should.be.rejectedWith(errors.SessionNotCreatedError)
      );
    });
  });
});
