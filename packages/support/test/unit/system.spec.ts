import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {system} from '../../lib';
import os from 'node:os';
import {createSandbox} from 'sinon';
import * as teen_process from 'teen_process';
import _ from 'lodash';

const SANDBOX = Symbol();
const libs = {os, system};

describe('system', function () {
  let sandbox: ReturnType<typeof createSandbox>;
  let osMock: ReturnType<typeof createSandbox>['mock'] extends (obj: infer O) => infer R ? R : never;
  let mocks: Record<string | symbol, any>;

  before(function () {
    use(chaiAsPromised);
  });

  beforeEach(function () {
    sandbox = createSandbox();
    mocks = {};
  });

  afterEach(function () {
    sandbox.verify();
    sandbox.restore();
  });

  describe('isX functions', function () {
    beforeEach(function () {
      osMock = sandbox.mock(os);
    });
    afterEach(function () {
      osMock.verify();
    });

    it('should correctly return Windows System if it is a Windows', function () {
      osMock.expects('type').returns('Windows_NT');
      expect(system.isWindows()).to.be.true;
    });

    it('should correctly return Mac if it is a Mac', function () {
      osMock.expects('type').returns('Darwin');
      expect(system.isMac()).to.be.true;
    });

    it('should correctly return Linux if it is a Linux', function () {
      osMock.expects('type').twice().returns('Linux');
      expect(system.isLinux()).to.be.true;
    });
  });

  describe('mac OSX version', function () {
    it('should return correct version for 10.10.5', async function () {
      (sandbox.stub(teen_process, 'exec') as any).get(() =>
        sandbox.stub().withArgs('sw_vers', ['-productVersion']).returns({stdout: '10.10.5'})
      );
      await expect(system.macOsxVersion()).to.eventually.equal('10.10');
    });

    it('should return correct version for 10.12', async function () {
      (sandbox.stub(teen_process, 'exec') as any).get(() =>
        sandbox.stub().withArgs('sw_vers', ['-productVersion']).returns({stdout: '10.12.0'})
      );
      await expect(system.macOsxVersion()).to.eventually.equal('10.12');
    });

    it('should return correct version for 10.12 with newline', async function () {
      (sandbox.stub(teen_process, 'exec') as any).get(() =>
        sandbox.stub().withArgs('sw_vers', ['-productVersion']).returns({stdout: '10.12   \n'})
      );
      await expect(system.macOsxVersion()).to.eventually.equal('10.12');
    });

    it("should throw an error if OSX version can't be determined", async function () {
      const invalidOsx = 'error getting operation system version blabla';
      (sandbox.stub(teen_process, 'exec') as any).get(() =>
        sandbox
          .stub()
          .withArgs('sw_vers', ['-productVersion'])
          .returns({stdout: invalidOsx})
      );
      await expect(system.macOsxVersion()).to.eventually.be.rejectedWith(
        new RegExp(_.escapeRegExp(invalidOsx))
      );
    });
  });

  describe('architecture', function () {
    beforeEach(function () {
      mocks[SANDBOX] = sandbox;
      for (const [key, value] of _.toPairs(libs)) {
        mocks[key] = sandbox.mock(value);
      }
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should return correct architecture if it is a 64 bit Mac/Linux', async function () {
      mocks.os.expects('type').thrice().returns('Darwin');
      (sandbox.stub(teen_process, 'exec') as any).get(() =>
        sandbox.stub().withArgs('uname', ['-m']).returns({stdout: 'x86_64'})
      );
      const arch = await system.arch();
      expect(arch).to.equal('64');
      mocks[SANDBOX].verify();
    });

    it('should return correct architecture if it is a 32 bit Mac/Linux', async function () {
      mocks.os.expects('type').twice().returns('Linux');
      (sandbox.stub(teen_process, 'exec') as any).get(() =>
        sandbox.stub().withArgs('uname', ['-m']).returns({stdout: 'i686'})
      );
      const arch = await system.arch();
      expect(arch).to.equal('32');
      mocks[SANDBOX].verify();
    });

    it('should return correct architecture if it is a 64 bit Windows', async function () {
      mocks.os.expects('type').thrice().returns('Windows_NT');
      mocks.system.expects('isOSWin64').once().returns(true);
      const arch = await system.arch();
      expect(arch).to.equal('64');
      mocks[SANDBOX].verify();
    });

    it('should return correct architecture if it is a 32 bit Windows', async function () {
      mocks.os.expects('type').thrice().returns('Windows_NT');
      mocks.system.expects('isOSWin64').once().returns(false);
      const arch = await system.arch();
      expect(arch).to.equal('32');
      mocks[SANDBOX].verify();
    });
  });

  it('should know architecture', function () {
    return system.arch();
  });
});
