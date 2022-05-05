// @ts-check

import B from 'bluebird';
import {default as BaseDriver, errors} from '../../../lib';
import logger from '../../../lib/basedriver/logger';
import {createSandbox} from 'sinon';

describe('Desired Capabilities', function () {
  let d;
  let sandbox;

  beforeEach(function () {
    d = new BaseDriver();
    sandbox = createSandbox();
    sandbox.spy(d.log, 'warn');
    sandbox.spy(logger, 'warn');
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should require platformName and deviceName', async function () {
    await d
      .createSession({
        firstMatch: [{}],
      })
      .should.eventually.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  it('should require platformName', async function () {
    await d
      .createSession({
        alwaysMatch: {
          'appium:deviceName': 'Delorean',
        },
      })
      .should.eventually.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  it('should not care about cap order', async function () {
    await d.createSession(null, null, {
      alwaysMatch: {
        'appium:deviceName': 'Delorean',
        platformName: 'iOS',
      },
    }).should.eventually.be.fulfilled;
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
      })
      .should.eventually.be.rejectedWith(errors.SessionNotCreatedError, /necessary.*proper/);
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
      })
      .should.eventually.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  it('should accept extra capabilities', async function () {
    await d.createSession(null, null, {
      alwaysMatch: {
        platformName: 'iOS',
        'appium:deviceName': 'Delorean',
        'appium:extra': 'cheese',
        'appium:hold the': 'sauce',
      },
    }).should.eventually.be.fulfilled;
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
    });

    d.log.warn.should.have.been.called;
  });

  it('should be sensitive to the case of caps', async function () {
    await d
      .createSession(null, null, {
        alwaysMatch: {
          platformname: 'iOS',
          'appium:deviceName': 'Delorean',
        },
      })
      .should.eventually.be.rejectedWith(errors.SessionNotCreatedError, /platformName/);
  });

  describe('boolean capabilities', function () {
    it('should allow a string "false"', async function () {
      await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Delorean',
          'appium:noReset': 'false',
        },
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
          'appium:noReset': 'true',
        },
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
          'appium:newCommandTimeout': '1',
        },
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
          'appium:newCommandTimeout': '1.1',
        },
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
          platformName: {a: 'iOS'},
          'appium:deviceName': 'Delorean',
        },
      })
      .should.eventually.be.rejectedWith(errors.SessionNotCreatedError, /platformName/i);
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
    });

    logger.warn.should.have.been.called;
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
      })
      .should.eventually.be.rejectedWith(/'foo' must be of type string/);

    try {
      await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Dumb',
          'appium:foo': undefined,
        },
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
      })
      .should.eventually.be.rejectedWith(/blank/);

    await d
      .createSession(null, {
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Dumb',
          'appium:foo': '',
        },
      })
      .should.eventually.be.rejectedWith(/blank/);

    await d
      .createSession({
        firstMatch: [
          {
            platformName: 'iOS',
            'appium:deviceName': 'Dumb',
            'appium:foo': {},
          },
        ],
      })
      .should.eventually.be.rejectedWith(/blank/);

    await d
      .createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Dumb',
          'appium:foo': [],
        },
      })
      .should.eventually.be.rejectedWith(/blank/);

    await d
      .createSession({
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': 'Dumb',
          'appium:foo': '  ',
        },
      })
      .should.eventually.be.rejectedWith(/blank/);
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
      try {
        sessionId.should.exist;
        caps.should.eql({
          platformName: 'iOS',
          deviceName: 'Delorean',
        });
      } finally {
        await d.deleteSession();
      }
    });

    it('should raise an error if w3c capabilities is not a plain JSON object', async function () {
      const testValues = [true, 'string', [], 100];
      // this loop runs in parallel, and does not guarantee all assertions will be made
      await B.map(testValues, (val) =>
        d
          .createSession(null, null, val)
          .should.eventually.be.rejectedWith(errors.SessionNotCreatedError)
      );
    });
  });
});
