import { default as BaseDriver, errors } from '../..';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import logger from '../../lib/basedriver/logger';
import sinon from 'sinon';

const should = chai.should();
chai.use(chaiAsPromised);

describe('Desired Capabilities', function () {
  let d;

  beforeEach(function () {
    d = new BaseDriver();
    sinon.spy(logger, 'warn');
  });

  afterEach(function () {
    logger.warn.restore();
  });

  it('should require platformName and deviceName', async function () {
    try {
      await d.createSession({});
    } catch (e) {
      e.should.be.instanceof(errors.SessionNotCreatedError);
      e.message.should.contain('platformName');
      return;
    }

    should.fail('error should have been thrown');
  });


  it('should require platformName', async function () {
    try {
      await d.createSession({'deviceName': 'Delorean'});
    } catch (e) {
      e.should.be.instanceof(errors.SessionNotCreatedError);
      e.message.should.contain('platformName');
      return;
    }

    should.fail('error should have been thrown');
  });

  it('should not care about cap order', async function () {

    await d.createSession({
      deviceName: 'Delorean',
      platformName: 'iOS'
    });

  });

  it('should check required caps which are added to driver', async function () {
    d.desiredCapConstraints = {
      necessary: {
        presence: true
      },
      proper: {
        presence: true,
        isString: true,
        inclusion: ['Delorean', 'Reventon']
      }
    };

    try {
      await d.createSession({
        'platformName': 'iOS',
        'deviceName': 'Delorean'
      });
    } catch (e) {
      e.should.be.instanceof(errors.SessionNotCreatedError);
      e.message.should.contain('necessary');
      e.message.should.contain('proper');
      return;
    }

    should.fail('error should have been thrown');
  });

  it('should check added required caps in addition to base', async function () {
    d.desiredCapConstraints = {
      necessary: {
        presence: true
      },
      proper: {
        presence: true,
        isString: true,
        inclusion: ['Delorean', 'Reventon']
      }
    };

    try {
      await d.createSession({
        necessary: 'yup',
        proper: 'yup, your highness'
      });
    } catch (e) {
      e.should.be.instanceof(errors.SessionNotCreatedError);
      e.message.should.contain('platformName');
      return;
    }

    should.fail('error should have been thrown');
  });

  it('should accept extra capabilities', async function () {
    await d.createSession({
      'platformName': 'iOS',
      'deviceName': 'Delorean',
      'extra': 'cheese',
      'hold the': 'sauce'
    });
  });

  it('should log the use of extra caps', async function () {
    this.timeout(500);

    await d.createSession({
      'platformName': 'iOS',
      'deviceName': 'Delorean',
      'extra': 'cheese',
      'hold the': 'sauce'
    });

    logger.warn.callCount.should.be.above(0);
  });

  it('should be sensitive to the case of caps', async function () {
    try {
      await d.createSession({
        'platformname': 'iOS',
        'deviceName': 'Delorean'
      });
    } catch (e) {
      e.should.be.instanceof(errors.SessionNotCreatedError);
      e.message.should.contain('platformName');
      return;
    }

    should.fail('error should have been thrown');
  });

  describe('boolean capabilities', function () {
    it('should allow a string "false"', async function () {
      await d.createSession({
        'platformName': 'iOS',
        'deviceName': 'Delorean',
        'noReset': 'false'
      });
      logger.warn.callCount.should.be.above(0);

      let sessions = await d.getSessions();
      sessions[0].capabilities.noReset.should.eql(false);
    });

    it('should allow a string "true"', async function () {
      await d.createSession({
        'platformName': 'iOS',
        'deviceName': 'Delorean',
        'noReset': 'true'
      });
      logger.warn.callCount.should.be.above(0);

      let sessions = await d.getSessions();
      sessions[0].capabilities.noReset.should.eql(true);
    });

    it('should allow a string "true" in string capabilities', async function () {
      await d.createSession({
        'platformName': 'iOS',
        'deviceName': 'Delorean',
        'language': 'true'
      });
      logger.warn.callCount.should.equal(0);

      let sessions = await d.getSessions();
      sessions[0].capabilities.language.should.eql('true');
    });
  });

  describe('number capabilities', function () {
    it('should allow a string "1"', async function () {
      await d.createSession({
        'platformName': 'iOS',
        'deviceName': 'Delorean',
        'newCommandTimeout': '1'
      });
      logger.warn.callCount.should.be.above(0);

      let sessions = await d.getSessions();
      sessions[0].capabilities.newCommandTimeout.should.eql(1);
    });

    it('should allow a string "1.1"', async function () {
      await d.createSession({
        'platformName': 'iOS',
        'deviceName': 'Delorean',
        'newCommandTimeout': '1.1'
      });
      logger.warn.callCount.should.be.above(0);

      let sessions = await d.getSessions();
      sessions[0].capabilities.newCommandTimeout.should.eql(1.1);
    });

    it('should allow a string "1" in string capabilities', async function () {
      await d.createSession({
        'platformName': 'iOS',
        'deviceName': 'Delorean',
        'language': '1'
      });
      logger.warn.callCount.should.equal(0);

      let sessions = await d.getSessions();
      sessions[0].capabilities.language.should.eql('1');
    });
  });

  it ('should error if objects in caps', async function () {
    try {
      await d.createSession({
        'platformName': {a: 'iOS'},
        'deviceName': 'Delorean'
      });
    } catch (e) {
      e.should.be.instanceof(errors.SessionNotCreatedError);
      e.message.should.contain('platformName');
      return;
    }

    should.fail('error should have been thrown');
  });

  it('should check for deprecated caps', async function () {
    this.timeout(500);

    d.desiredCapConstraints = {
      'lynx-version': {
        deprecated: true
      }
    };

    await d.createSession({
      'platformName': 'iOS',
      'deviceName': 'Delorean',
      'lynx-version': 5
    });

    logger.warn.callCount.should.be.above(0);
  });

  it('should not warn if deprecated=false', async function () {
    this.timeout(500);

    d.desiredCapConstraints = {
      'lynx-version': {
        deprecated: false
      }
    };

    await d.createSession({
      'platformName': 'iOS',
      'deviceName': 'Delorean',
      'lynx-version': 5
    });

    logger.warn.callCount.should.equal(0);
  });

  it('should not validate against null/undefined caps', async function () {
    d.desiredCapConstraints = {
      'foo': {
        isString: true
      }
    };

    await d.createSession({
      platformName: 'iOS',
      deviceName: 'Dumb',
      foo: null
    });
    await d.deleteSession();

    await d.createSession({
      platformName: 'iOS',
      deviceName: 'Dumb',
      foo: 1
    }).should.eventually.be.rejectedWith(/was not valid/);

    await d.createSession({
      platformName: 'iOS',
      deviceName: 'Dumb',
      foo: undefined
    });
    await d.deleteSession();

    await d.createSession({
      platformName: 'iOS',
      deviceName: 'Dumb',
      foo: ''
    });
    await d.deleteSession();
  });

  it('should still validate null/undefined/empty caps whose presence is required', async function () {
    d.desiredCapConstraints = {
      foo: {
        presence: true
      },
    };

    await d.createSession({
      platformName: 'iOS',
      deviceName: 'Dumb',
      foo: null
    }).should.eventually.be.rejectedWith(/blank/);

    await d.createSession({
      platformName: 'iOS',
      deviceName: 'Dumb',
      foo: ''
    }).should.eventually.be.rejectedWith(/blank/);

    await d.createSession({
      platformName: 'iOS',
      deviceName: 'Dumb',
      foo: {}
    }).should.eventually.be.rejectedWith(/blank/);

    await d.createSession({
      platformName: 'iOS',
      deviceName: 'Dumb',
      foo: []
    }).should.eventually.be.rejectedWith(/blank/);

    await d.createSession({
      platformName: 'iOS',
      deviceName: 'Dumb',
      foo: '  '
    }).should.eventually.be.rejectedWith(/blank/);
  });

  describe('w3c', function () {
    it('should accept w3c capabilities', async function () {
      const [sessionId, caps] = await d.createSession(null, null, {
        alwaysMatch: {
          platformName: 'iOS',
          deviceName: 'Delorean'
        }, firstMatch: [{}],
      });
      sessionId.should.exist;
      caps.should.eql({
        platformName: 'iOS',
        deviceName: 'Delorean',
      });
      await d.deleteSession();
    });

    it('should ignore w3c capabilities if it is not a plain JSON object', async function () {
      for (let val of [true, 'string', [], 100]) {
        const [sessionId, caps] = await d.createSession({
          platformName: 'iOS',
          deviceName: 'Delorean'
        }, null, val);
        sessionId.should.exist;
        caps.should.eql({
          platformName: 'iOS',
          deviceName: 'Delorean',
        });
        await d.deleteSession();
      }
    });
  });
});
