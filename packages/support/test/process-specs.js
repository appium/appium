import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as teenProcess from 'teen_process';
import sinon from 'sinon';
import { process } from '../index.js';
import { retryInterval } from 'asyncbox';


chai.should();
chai.use(chaiAsPromised);

const SubProcess = teenProcess.SubProcess;

describe('process', function () {
  describe('getProcessIds', function () {
    let proc;
    before(async function () {
      proc = new SubProcess('tail', ['-f', __filename]);
      await proc.start();
    });
    after(async function () {
      await proc.stop();
    });
    it('should get return an array for existing process', async function () {
      let pids = await process.getProcessIds('tail');
      pids.should.be.an.instanceof(Array);
    });
    it('should get process identifiers for existing process', async function () {
      let pids = await process.getProcessIds('tail');
      pids.should.have.length.at.least(1);
    });
    it('should get an empty array when the process does not exist', async function () {
      let pids = await process.getProcessIds('sadfgasdfasdf');
      pids.should.have.length(0);
    });
    it('should throw an error if pgrep fails', async function () {
      let tpMock = sinon.mock(teenProcess);
      tpMock.expects('exec').throws({message: 'Oops', code: 2});

      await process.getProcessIds('tail').should.eventually.be.rejectedWith(/Oops/);

      tpMock.restore();
    });
  });

  describe('killProcess', function () {
    let proc;
    beforeEach(async function () {
      proc = new SubProcess('tail', ['-f', __filename]);
      await proc.start();
    });
    afterEach(async function () {
      if (proc.isRunning) {
        await proc.stop();
      }
    });
    it('should kill process that is running', async function () {
      proc.isRunning.should.be.true;
      await process.killProcess('tail');

      // it may take a moment to actually be registered as killed
      await retryInterval(10, 100, async () => { // eslint-disable-line require-await
        proc.isRunning.should.be.false;
      });
    });
    it('should do nothing if the process does not exist', async function () {
      proc.isRunning.should.be.true;
      await process.killProcess('asdfasdfasdf');

      await retryInterval(10, 100, async () => { // eslint-disable-line require-await
        proc.isRunning.should.be.false;
      }).should.eventually.be.rejected;
    });
    it('should throw an error if pgrep fails', async function () {
      let tpMock = sinon.mock(teenProcess);
      tpMock.expects('exec').throws({message: 'Oops', code: 2});

      await process.killProcess('tail').should.eventually.be.rejectedWith(/Oops/);

      tpMock.restore();
    });
    it('should throw an error if pkill fails', async function () {
      let tpMock = sinon.mock(teenProcess);
      tpMock.expects('exec').twice()
        .onFirstCall().returns({stdout: '42\n'})
        .onSecondCall().throws({message: 'Oops', code: 2});

      await process.killProcess('tail').should.eventually.be.rejectedWith(/Oops/);

      tpMock.restore();
    });
  });
});
