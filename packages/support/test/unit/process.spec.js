import * as teenProcess from 'teen_process';
// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';
import {process, system} from '../../lib';
import {retryInterval} from 'asyncbox';

const SubProcess = teenProcess.SubProcess;

describe('process', function () {
  let sandbox;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getProcessIds', function () {
    let proc;
    before(async function () {
      if (system.isWindows()) {
        return this.skip();
      }
      proc = new SubProcess('tail', ['-f', __filename]);
      await proc.start();
    });
    after(async function () {
      if (proc) {
        await proc.stop();
      }
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
      let tpMock = sandbox.mock(teenProcess);
      tpMock.expects('exec').throws({message: 'Oops', code: 2});

      await process.getProcessIds('tail').should.eventually.be.rejectedWith(/Oops/);

      tpMock.restore();
    });
  });

  describe('killProcess', function () {
    let proc;
    before(function () {
      if (system.isWindows()) {
        return this.skip();
      }
    });
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

      await retryInterval(10, 100, async () => {
        proc.isRunning.should.be.false;
      });
    });
    it('should do nothing if the process does not exist', async function () {
      proc.isRunning.should.be.true;
      await process.killProcess('asdfasdfasdf');

      await retryInterval(10, 100, async () => {
        proc.isRunning.should.be.false;
      }).should.eventually.be.rejected;
    });
    it('should throw an error if pgrep fails', async function () {
      let tpMock = sandbox.mock(teenProcess);
      tpMock.expects('exec').throws({message: 'Oops', code: 2});

      await process.killProcess('tail').should.eventually.be.rejectedWith(/Oops/);

      tpMock.restore();
    });
    it('should throw an error if pkill fails', async function () {
      let tpMock = sandbox.mock(teenProcess);
      tpMock
        .expects('exec')
        .twice()
        .onFirstCall()
        .returns({stdout: '42\n'})
        .onSecondCall()
        .throws({message: 'Oops', code: 2});

      await process.killProcess('tail').should.eventually.be.rejectedWith(/Oops/);

      tpMock.restore();
    });
  });
});
