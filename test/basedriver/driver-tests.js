import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import B from 'bluebird';

const should = chai.should();
chai.use(chaiAsPromised);

// wrap these tests in a function so we can export the tests and re-use them
// for actual driver implementations
function baseDriverUnitTests (DriverClass, defaultCaps = {}) {
  describe('BaseDriver', () => {

    let d;
    beforeEach(() => {
      d = new DriverClass();
    });

    it('should return an empty status object', async () => {
      let status = await d.getStatus();
      status.should.eql({});
    });

    it('should return a sessionId from createSession', async () => {
      let [sessId] = await d.createSession(defaultCaps);
      should.exist(sessId);
      sessId.should.be.a('string');
      sessId.length.should.be.above(5);
    });

    it('should not be able to start two sessions without closing the first', async () => {
      await d.createSession(defaultCaps);
      await d.createSession(defaultCaps).should.eventually.be.rejectedWith('session');
    });

    it('should be able to delete a session', async () => {
      let sessionId1 = await d.createSession(defaultCaps);
      await d.deleteSession();
      should.equal(d.sessionId, null);
      let sessionId2 = await d.createSession(defaultCaps);
      sessionId1.should.not.eql(sessionId2);
    });

    it('should get the current session', async () => {
      let [, caps] = await d.createSession(defaultCaps);
      caps.should.equal(await d.getSession());
    });

    it('should return sessions if no session exists', async () => {
      let sessions = await d.getSessions();
      sessions.length.should.equal(0);
    });

    it('should return sessions', async () => {
      let caps = _.clone(defaultCaps);
      caps.a = 'cap';
      await d.createSession(caps);
      let sessions = await d.getSessions();

      sessions.length.should.equal(1);
      sessions[0].should.eql({
        id: d.sessionId,
        capabilities: caps
      });
    });

    it('should fulfill an unexpected driver quit promise', async () => {
      // make a command that will wait a bit so we can crash while it's running
      d.getStatus = async function () {
        await B.delay(100);
      }.bind(d);
      let cmdPromise = d.executeCommand('getStatus');
      await B.delay(0);
      d.startUnexpectedShutdown(new Error('We crashed'));
      await cmdPromise.should.be.rejectedWith(/We crashed/);
      await d.onUnexpectedShutdown.should.be.rejectedWith(/We crashed/);
    });

    it('should not allow commands in middle of unexpected shutdown', async () => {
      // make a command that will wait a bit so we can crash while it's running
      d.oldDeleteSession = d.deleteSession;
      d.deleteSession = async function () {
        await B.delay(100);
        await this.oldDeleteSession();
      }.bind(d);
      let caps = _.clone(defaultCaps);
      await d.createSession(caps);
      d.startUnexpectedShutdown(new Error('We crashed'));
      await d.onUnexpectedShutdown.should.be.rejectedWith(/We crashed/);
      await d.executeCommand('getSession').should.be.rejectedWith(/shut down/);
    });

    it('should allow new commands after done shutting down', async () => {
      // make a command that will wait a bit so we can crash while it's running
      d.oldDeleteSession = d.deleteSession;
      d.deleteSession = async function () {
        await B.delay(100);
        await this.oldDeleteSession();
      }.bind(d);
      let caps = _.clone(defaultCaps);
      await d.createSession(caps);
      d.startUnexpectedShutdown(new Error('We crashed'));
      await d.onUnexpectedShutdown.should.be.rejectedWith(/We crashed/);
      await d.executeCommand('getSession').should.be.rejectedWith(/shut down/);
      await B.delay(100);
      await d.executeCommand('createSession', caps);
      await d.deleteSession();
    });

    it('should have a method to get driver for a session', async () => {
      let [sessId] = await d.createSession(defaultCaps);
      d.driverForSession(sessId).should.eql(d);
    });

    describe('command queue', () => {
      let d = new DriverClass();

      let waitMs = 10;
      d.getStatus = async function () {
        await B.delay(waitMs);
        return Date.now();
      }.bind(d);

      d.getSessions = async function () {
        await B.delay(waitMs);
        throw new Error('multipass');
      }.bind(d);

      afterEach(() => {
        d.clearNewCommandTimeout();
      });

      it('should queue commands and.executeCommand/respond in the order received', async () => {
        let numCmds = 10;
        let cmds = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.executeCommand('getStatus'));
        }
        let results = await B.all(cmds);
        for (let i = 1; i < numCmds; i++) {
          if (results[i] <= results[i - 1]) {
            throw new Error('Got result out of order');
          }
        }
      });

      it('should handle errors correctly when queuing', async () => {
        let numCmds = 10;
        let cmds = [];
        for (let i = 0; i < numCmds; i++) {
          if (i === 5) {
            cmds.push(d.executeCommand('getSessions'));
          } else {
            cmds.push(d.executeCommand('getStatus'));
          }
        }
        let results = await B.settle(cmds);
        for (let i = 1; i < 5; i++) {
          if (results[i].value() <= results[i - 1].value()) {
            throw new Error('Got result out of order');
          }
        }
        results[5].reason().message.should.contain('multipass');
        for (let i = 7; i < numCmds; i++) {
          if (results[i].value() <= results[i - 1].value()) {
            throw new Error('Got result out of order');
          }
        }
      });

      it('should not care if queue empties for a bit', async () => {
        let numCmds = 10;
        let cmds = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.executeCommand('getStatus'));
        }
        let results = await B.all(cmds);
        cmds = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.executeCommand('getStatus'));
        }
        results = await B.all(cmds);
        for (let i = 1; i < numCmds; i++) {
          if (results[i] <= results[i - 1]) {
            throw new Error('Got result out of order');
          }
        }
      });
    });

    describe('timeouts', () => {
      before(async () => {
        await d.createSession(defaultCaps);
      });
      describe('command', () => {
        it('should exist by default', async () => {
          d.newCommandTimeoutMs.should.equal(60000);
        });
        it('should be settable through `timeouts`', async () => {
          await d.timeouts('command', 20);
          d.newCommandTimeoutMs.should.equal(20);
        });
      });
      describe('implicit', () => {
        it('should not exist by default', async () => {
          d.implicitWaitMs.should.equal(0);
        });
        it('should be settable through `timeouts`', async () => {
          await d.timeouts('implicit', 20);
          d.implicitWaitMs.should.equal(20);
        });
      });
    });

    describe('reset compatibility', () => {
      it('should not allow both fullReset and noReset to be true', async () => {
        let newCaps = Object.assign({}, defaultCaps, {
          fullReset: true,
          noReset: true
        });
        await d.createSession(newCaps).should.eventually.be.rejectedWith(
            /noReset.+fullReset/);
      });
    });

    describe('proxying', () => {
      let sessId;
      beforeEach(async () => {
        [sessId] = await d.createSession(defaultCaps);
      });
      describe('#proxyActive', () => {
        it('should exist', () => {
          d.proxyActive.should.be.an.instanceof(Function);
        });
        it('should return false', () => {
          d.proxyActive(sessId).should.be.false;
        });
        it('should throw an error when sessionId is wrong', () => {
          (() => { d.proxyActive('aaa'); }).should.throw;
        });
      });

      describe('#getProxyAvoidList', () => {
        it('should exist', () => {
          d.getProxyAvoidList.should.be.an.instanceof(Function);
        });
        it('should return an array', () => {
          d.getProxyAvoidList(sessId).should.be.an.instanceof(Array);
        });
        it('should throw an error when sessionId is wrong', () => {
          (() => { d.getProxyAvoidList('aaa'); }).should.throw;
        });
      });

      describe('#canProxy', () => {
        it('should have a #canProxy method', () => {
          d.canProxy.should.be.an.instanceof(Function);
        });
        it('should return false from #canProxy', () => {
          d.canProxy(sessId).should.be.false;
        });
        it('should throw an error when sessionId is wrong', () => {
          (() => { d.canProxy(); }).should.throw;
        });
      });
    });

    describe('event timing framework', () => {
      let beforeStartTime;
      beforeEach(async () => {
        beforeStartTime = Date.now();
        d.shouldValidateCaps = false;
        await d.executeCommand('createSession', [defaultCaps]);
      });
      describe('#eventHistory', () => {
        it('should have an eventHistory property', () => {
          should.exist(d.eventHistory);
          should.exist(d.eventHistory.commands);
        });

        it('should have a session start timing after session start', () => {
          let {newSessionRequested, newSessionStarted} = d.eventHistory;
          newSessionRequested.should.have.length(1);
          newSessionStarted.should.have.length(1);
          newSessionRequested[0].should.be.a('number');
          newSessionStarted[0].should.be.a('number');
          (newSessionRequested[0] >= beforeStartTime).should.be.true;
          (newSessionStarted[0] >= newSessionRequested[0]).should.be.true;
        });

        it('should include a commands list', async () => {
          await d.executeCommand('getStatus', []);
          d.eventHistory.commands.length.should.equal(2);
          d.eventHistory.commands[1].cmd.should.equal('getStatus');
          d.eventHistory.commands[1].startTime.should.be.a('number');
          d.eventHistory.commands[1].endTime.should.be.a('number');
        });
      });
      describe('#logEvent', () => {
        it('should allow logging arbitrary events', () => {
          d.logEvent('foo');
          d.eventHistory.foo[0].should.be.a('number');
          (d.eventHistory.foo[0] >= beforeStartTime).should.be.true;
        });
        it('should not allow reserved or oddly formed event names', () => {
          (() => {
            d.logEvent('commands');
          }).should.throw();
          (() => {
            d.logEvent(1);
          }).should.throw();
          (() => {
            d.logEvent({});
          }).should.throw();
        });
      });
      it('should allow logging the same event multiple times', () => {
        d.logEvent('bar');
        d.logEvent('bar');
        d.eventHistory.bar.should.have.length(2);
        d.eventHistory.bar[1].should.be.a('number');
        (d.eventHistory.bar[1] >= d.eventHistory.bar[0]).should.be.true;
      });
      describe('getSession decoration', () => {
        it('should decorate getSession response if opt-in cap is provided', async () => {
          let res = await d.getSession();
          should.not.exist(res.events);

          d.caps.eventTimings = true;
          res = await d.getSession();
          should.exist(res.events);
          should.exist(res.events.newSessionRequested);
          res.events.newSessionRequested[0].should.be.a('number');
        });
      });
    });
  });
}

export default baseDriverUnitTests;
