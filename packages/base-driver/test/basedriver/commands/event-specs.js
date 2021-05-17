import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { BaseDriver } from '../../..';


chai.use(chaiAsPromised);

describe('logging custom events', function () {
  it('should allow logging of events', async function () {
    const d = new BaseDriver();
    d._eventHistory.should.eql({commands: []});
    await d.logCustomEvent('myorg', 'myevent');
    _.keys(d._eventHistory).should.eql(['commands', 'myorg:myevent']);
  });
  it('should get all events including custom ones', async function () {
    const d = new BaseDriver();
    d._eventHistory.should.eql({commands: []});
    d.logEvent('appiumEvent');
    await d.logCustomEvent('myorg', 'myevent');
    const events = await d.getLogEvents();
    _.keys(events).should.eql(['commands', 'appiumEvent', 'myorg:myevent']);
  });
});

describe('#getLogEvents', function () {
  it('should allow to get all events', async function () {
    const d = new BaseDriver();
    d._eventHistory.should.eql({commands: []});
    d._eventHistory.testCommand = ['1', '2', '3'];
    await d.getLogEvents().should.eql({
      commands: [], testCommand: ['1', '2', '3']
    });
  });

  it('should filter with testCommand', async function () {
    const d = new BaseDriver();
    d._eventHistory.should.eql({commands: []});
    d._eventHistory.testCommand = ['1', '2', '3'];
    await d.getLogEvents('testCommand').should.eql({
      testCommand: ['1', '2', '3']
    });
  });

  it('should not filter with wrong but can be a part of the event name', async function () {
    const d = new BaseDriver();
    d._eventHistory.should.eql({commands: []});
    d._eventHistory.testCommand = ['1', '2', '3'];
    await d.getLogEvents('testCommandDummy').should.eql({});
  });

  it('should filter with multiple event keys', async function () {
    const d = new BaseDriver();
    d._eventHistory.should.eql({commands: []});
    d._eventHistory.testCommand = ['1', '2', '3'];
    d._eventHistory.testCommand2 = ['4', '5'];
    await d.getLogEvents(['testCommand', 'testCommand2']).should.eql({
      testCommand: ['1', '2', '3'], testCommand2: ['4', '5']
    });
  });

  it('should filter with custom events', async function () {
    const d = new BaseDriver();
    d._eventHistory.should.eql({commands: []});
    d._eventHistory['custom:appiumEvent'] = ['1', '2', '3'];
    await d.getLogEvents(['custom:appiumEvent']).should.eql({
      'custom:appiumEvent': ['1', '2', '3']
    });
  });

  it('should not filter with no existed event name', async function () {
    const d = new BaseDriver();
    d._eventHistory.should.eql({commands: []});
    d._eventHistory.testCommand = ['1', '2', '3'];
    await d.getLogEvents(['noEventName']).should.eql({});
  });
});
