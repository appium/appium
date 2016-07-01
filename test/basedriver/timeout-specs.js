import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import BaseDriver from '../..';
import sinon from 'sinon';


chai.should();
chai.use(chaiAsPromised);


describe('timeout', () => {
  let driver = new BaseDriver();
  let implicitWaitSpy, newCommandTimeoutSpy;
  before(() => {
    implicitWaitSpy = sinon.spy(driver, 'setImplicitWait');
    newCommandTimeoutSpy = sinon.spy(driver, 'setNewCommandTimeout');
  });
  beforeEach(() => {
    driver.implicitWaitMs = 0;
  });
  afterEach(() => {
    implicitWaitSpy.reset();
    newCommandTimeoutSpy.reset();
  });
  describe('timeouts', () => {
    describe('errors', () => {
      it('should throw an error if something random is sent', async () => {
        await driver.timeouts('random timeout', 'howdy').should.eventually.be.rejected;
      });
      it('should throw an error if timeout is negative', async () => {
        await driver.timeouts('random timeout', -42).should.eventually.be.rejected;
      });
      it('should throw an errors if timeout type is unknown', async () => {
        await driver.timeouts('random timeout', 42).should.eventually.be.rejected;
      });
    });
    describe('implicit wait', () => {
      it('should call setImplicitWait when given an integer', async () => {
        await driver.timeouts('implicit', 42);
        implicitWaitSpy.calledOnce.should.be.true;
        implicitWaitSpy.firstCall.args[0].should.equal(42);
        driver.implicitWaitMs.should.eql(42);
      });
      it('should call setImplicitWait when given a string', async () => {
        await driver.timeouts('implicit', '42');
        implicitWaitSpy.calledOnce.should.be.true;
        implicitWaitSpy.firstCall.args[0].should.equal(42);
        driver.implicitWaitMs.should.eql(42);
      });
    });
  });
  describe('implicitWait', () => {
    it('should call setImplicitWait when given an integer', async () => {
      driver.implicitWait(42);
      implicitWaitSpy.calledOnce.should.be.true;
      implicitWaitSpy.firstCall.args[0].should.equal(42);
      driver.implicitWaitMs.should.eql(42);
    });
    it('should call setImplicitWait when given a string', () => {
      driver.implicitWait('42');
      implicitWaitSpy.calledOnce.should.be.true;
      implicitWaitSpy.firstCall.args[0].should.equal(42);
      driver.implicitWaitMs.should.eql(42);
    });
    it('should throw an error if something random is sent', async () => {
      await driver.implicitWait('howdy').should.eventually.be.rejected;
    });
    it('should throw an error if timeout is negative', async () => {
      await driver.implicitWait(-42).should.eventually.be.rejected;
    });
  });

  describe('set implicit wait', () => {
    it('should set the implicit wait with an integer', () => {
      driver.setImplicitWait(42);
      driver.implicitWaitMs.should.eql(42);
    });
    describe('with managed driver', () => {
      let managedDriver1 = new BaseDriver();
      let managedDriver2 = new BaseDriver();
      before(() => {
        driver.addManagedDriver(managedDriver1);
        driver.addManagedDriver(managedDriver2);
      });
      after(() => {
        driver.managedDrivers = [];
      });
      it('should set the implicit wait on managed drivers', () => {
        driver.setImplicitWait(42);
        driver.implicitWaitMs.should.eql(42);
        managedDriver1.implicitWaitMs.should.eql(42);
        managedDriver2.implicitWaitMs.should.eql(42);
      });
    });
  });
  describe('set new command timeout', () => {
    it('should set the new command timeout with an integer', () => {
      driver.setNewCommandTimeout(42);
      driver.newCommandTimeoutMs.should.eql(42);
    });
    describe('with managed driver', () => {
      let managedDriver1 = new BaseDriver();
      let managedDriver2 = new BaseDriver();
      before(() => {
        driver.addManagedDriver(managedDriver1);
        driver.addManagedDriver(managedDriver2);
      });
      after(() => {
        driver.managedDrivers = [];
      });
      it('should set the new command timeout on managed drivers', () => {
        driver.setNewCommandTimeout(42);
        driver.newCommandTimeoutMs.should.eql(42);
        managedDriver1.newCommandTimeoutMs.should.eql(42);
        managedDriver2.newCommandTimeoutMs.should.eql(42);
      });
    });
  });
});
