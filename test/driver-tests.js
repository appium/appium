import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mochawait';
import B from 'bluebird';

const should = chai.should();
chai.use(chaiAsPromised);

// wrap these tests in a function so we can export the tests and re-use them
// for actual driver implementations
function baseDriverUnitTests (DriverClass) {
  describe('BaseDriver', () => {

    let d;

    beforeEach(() => {
      d = new DriverClass();
    });

    it('should return a sessionId from createSession', async () => {
      let [sessId] = await d.createSession({});
      should.exist(sessId);
      sessId.should.be.a('string');
      sessId.length.should.be.above(5);
    });

    it('should not be able to start two sessions without closing the first', async () => {
      await d.createSession({});
      await d.createSession({}).should.eventually.be.rejectedWith('session');
    });

    it('should be able to delete a session', async () => {
      let sessionId1 = await d.createSession({});
      await d.deleteSession();
      should.equal(d.sessionId, null);
      let sessionId2 = await d.createSession({});
      sessionId1.should.not.eql(sessionId2);
    });

    it('should get the current session', async () => {
      let [,caps] = await d.createSession({});
      caps.should.equal(await d.getSession());
    });

    it('should return sessions if no session exists', async () => {
      let sessions = await d.getSessions();
      sessions.length.should.equal(0);
    });

    it('should return sessions', async () => {
      await d.createSession({a: 'cap'});
      let sessions = await d.getSessions();

      sessions.length.should.equal(1);
      sessions[0].should.eql({
        id: d.sessionId,
        capabilities: {a: 'cap'}
      });
    });

    it.skip('should emit an unexpected end session event', async () => {
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
        throw new Error("multipass");
      }.bind(d);

      it('should queue commands and execute/respond in the order received', async () => {
        let numCmds = 10;
        let cmds = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.execute('getStatus'));
        }
        let results = await B.all(cmds);
        for (let i = 1; i < numCmds; i++) {
          if (results[i] <= results[i - 1]) {
            throw new Error("Got result out of order");
          }
        }
      });

      it('should handle errors correctly when queuing', async () => {
        let numCmds = 10;
        let cmds = [];
        for (let i = 0; i < numCmds; i++) {
          if (i === 5) {
            cmds.push(d.execute('getSessions'));
          } else {
            cmds.push(d.execute('getStatus'));
          }
        }
        let results = await B.settle(cmds);
        for (let i = 1; i < 5; i++) {
          if (results[i].value() <= results[i - 1].value()) {
            throw new Error("Got result out of order");
          }
        }
        results[5].reason().message.should.contain("multipass");
        for (let i = 7; i < numCmds; i++) {
          if (results[i].value() <= results[i - 1].value()) {
            throw new Error("Got result out of order");
          }
        }
      });

      it('should not care if queue empties for a bit', async () => {
        let numCmds = 10;
        let cmds = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.execute('getStatus'));
        }
        let results = await B.all(cmds);
        cmds = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.execute('getStatus'));
        }
        results = await B.all(cmds);
        for (let i = 1; i < numCmds; i++) {
          if (results[i] <= results[i - 1]) {
            throw new Error("Got result out of order");
          }
        }
      });

    });

  });
}

export default baseDriverUnitTests;
