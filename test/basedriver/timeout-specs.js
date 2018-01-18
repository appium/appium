import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import BaseDriver from '../..';
import sinon from 'sinon';


chai.should();
chai.use(chaiAsPromised);


describe('timeout', function () {
  let driver = new BaseDriver();
  let implicitWaitSpy, newCommandTimeoutSpy;
  before(function () {
    implicitWaitSpy = sinon.spy(driver, 'setImplicitWait');
    newCommandTimeoutSpy = sinon.spy(driver, 'setNewCommandTimeout');
  });
  beforeEach(function () {
    driver.implicitWaitMs = 0;
  });
  afterEach(function () {
    implicitWaitSpy.reset();
    newCommandTimeoutSpy.reset();
  });
  describe('timeouts', function () {
    describe('errors', function () {
      it('should throw an error if something random is sent', async function () {
        await driver.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.MJSONWP, type: 'random timeout', ms: 'howdy'}, "1dcfe021-8fc8-49bd-8dac-e986d3091b97").should.eventually.be.rejected;
      });
      it('should throw an error if timeout is negative', async function () {
        await driver.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.MJSONWP, type: 'random timeout', ms: -42}, "1dcfe021-8fc8-49bd-8dac-e986d3091b97").should.eventually.be.rejected;
      });
      it('should throw an errors if timeout type is unknown', async function () {
        await driver.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.MJSONWP, type: 'random timeout', ms: 42}, "1dcfe021-8fc8-49bd-8dac-e986d3091b97").should.eventually.be.rejected;
      });
      it('should throw an error if something random is sent to scriptDuration', async function () {
        await driver.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: 123, pageLoad: undefined, implicit: undefined}, "1dcfe021-8fc8-49bd-8dac-e986d3091b97").should.eventually.be.rejected;
      });
      it('should throw an error if something random is sent to pageLoadDuration', async function () {
        await driver.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: undefined, pageLoad: 123, implicit: undefined}, "1dcfe021-8fc8-49bd-8dac-e986d3091b97").should.eventually.be.rejected;
      });
    });
    describe('implicit wait', function () {
      it('should call setImplicitWait when given an integer', async function () {
        await driver.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.MJSONWP, type: 'implicit', ms: 42}, "1dcfe021-8fc8-49bd-8dac-e986d3091b97");
        implicitWaitSpy.calledOnce.should.be.true;
        implicitWaitSpy.firstCall.args[0].should.equal(42);
        driver.implicitWaitMs.should.eql(42);
      });
      it('should call setImplicitWait when given a string', async function () {
        await driver.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.MJSONWP, type: 'implicit', ms: '42'}, "1dcfe021-8fc8-49bd-8dac-e986d3091b97");
        implicitWaitSpy.calledOnce.should.be.true;
        implicitWaitSpy.firstCall.args[0].should.equal(42);
        driver.implicitWaitMs.should.eql(42);
      });

      it('should call setImplicitWait when given an integer to implicitDuration', async function () {
        await driver.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: undefined, pageLoad: undefined, implicit: 42}, "1dcfe021-8fc8-49bd-8dac-e986d3091b97");
        implicitWaitSpy.calledOnce.should.be.true;
        implicitWaitSpy.firstCall.args[0].should.equal(42);
        driver.implicitWaitMs.should.eql(42);
      });
      it('should call setImplicitWait when given a string to implicitDuration', async function () {
        await driver.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: undefined, pageLoad: undefined, implicit: '42'}, "1dcfe021-8fc8-49bd-8dac-e986d3091b97");
        implicitWaitSpy.calledOnce.should.be.true;
        implicitWaitSpy.firstCall.args[0].should.equal(42);
        driver.implicitWaitMs.should.eql(42);
      });
    });
  });
  describe('implicitWait', function () {
    it('should call setImplicitWait when given an integer', async function () {
      driver.setImplicitWait(42);
      implicitWaitSpy.calledOnce.should.be.true;
      implicitWaitSpy.firstCall.args[0].should.equal(42);
      driver.implicitWaitMs.should.eql(42);
    });
    it('should call setImplicitWait when given a string', function () {
      driver.implicitWait('42');
      implicitWaitSpy.calledOnce.should.be.true;
      implicitWaitSpy.firstCall.args[0].should.equal(42);
      driver.implicitWaitMs.should.eql(42);
    });
    it('should throw an error if something random is sent', async function () {
      await driver.implicitWait('howdy').should.eventually.be.rejected;
    });
    it('should throw an error if timeout is negative', async function () {
      await driver.implicitWait(-42).should.eventually.be.rejected;
    });
  });

  describe('set implicit wait', function () {
    it('should set the implicit wait with an integer', function () {
      driver.setImplicitWait(42);
      driver.implicitWaitMs.should.eql(42);
    });
    describe('with managed driver', function () {
      let managedDriver1 = new BaseDriver();
      let managedDriver2 = new BaseDriver();
      before(function () {
        driver.addManagedDriver(managedDriver1);
        driver.addManagedDriver(managedDriver2);
      });
      after(function () {
        driver.managedDrivers = [];
      });
      it('should set the implicit wait on managed drivers', function () {
        driver.setImplicitWait(42);
        driver.implicitWaitMs.should.eql(42);
        managedDriver1.implicitWaitMs.should.eql(42);
        managedDriver2.implicitWaitMs.should.eql(42);
      });
    });
  });
  describe('set new command timeout', function () {
    it('should set the new command timeout with an integer', function () {
      driver.setNewCommandTimeout(42);
      driver.newCommandTimeoutMs.should.eql(42);
    });
    describe('with managed driver', function () {
      let managedDriver1 = new BaseDriver();
      let managedDriver2 = new BaseDriver();
      before(function () {
        driver.addManagedDriver(managedDriver1);
        driver.addManagedDriver(managedDriver2);
      });
      after(function () {
        driver.managedDrivers = [];
      });
      it('should set the new command timeout on managed drivers', function () {
        driver.setNewCommandTimeout(42);
        driver.newCommandTimeoutMs.should.eql(42);
        managedDriver1.newCommandTimeoutMs.should.eql(42);
        managedDriver2.newCommandTimeoutMs.should.eql(42);
      });
    });
  });
});
