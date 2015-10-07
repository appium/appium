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
      let [,caps] = await d.createSession(defaultCaps);
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
      d.getStatus = async () => {
        await B.delay(waitMs);
        return Date.now();
      }.bind(d);

      d.getSessions = async () => {
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
  });
}

export default baseDriverUnitTests;
