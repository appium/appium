import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type {InitialOpts} from '@appium/types';
import _ from 'lodash';
import {BaseDriver} from '../../../../lib';

chai.use(chaiAsPromised);

describe('logging custom events', function () {
  it('should allow logging of events', async function () {
    const d = new BaseDriver({} as InitialOpts);
    expect((d as any)._eventHistory).to.eql({commands: []});
    await d.logCustomEvent('myorg', 'myevent');
    expect(_.keys((d as any)._eventHistory)).to.eql(['commands', 'myorg:myevent']);
  });
  it('should get all events including custom ones', async function () {
    const d = new BaseDriver({} as InitialOpts);
    expect((d as any)._eventHistory).to.eql({commands: []});
    d.logEvent('appiumEvent');
    await d.logCustomEvent('myorg', 'myevent');
    const events = await d.getLogEvents();
    expect(_.keys(events)).to.eql(['commands', 'appiumEvent', 'myorg:myevent']);
  });
});

describe('#getLogEvents', function () {
  it('should allow to get all events', async function () {
    const d = new BaseDriver({} as InitialOpts);
    expect((d as any)._eventHistory).to.eql({commands: []});
    (d as any)._eventHistory.testCommand = ['1', '2', '3'];
    expect(await d.getLogEvents()).to.eql({
      commands: [],
      testCommand: ['1', '2', '3'],
    });
  });

  it('should filter with testCommand', async function () {
    const d = new BaseDriver({} as InitialOpts);
    expect((d as any)._eventHistory).to.eql({commands: []});
    (d as any)._eventHistory.testCommand = ['1', '2', '3'];
    expect(await d.getLogEvents('testCommand')).to.eql({
      testCommand: ['1', '2', '3'],
    });
  });

  it('should not filter with wrong but can be a part of the event name', async function () {
    const d = new BaseDriver({} as InitialOpts);
    expect((d as any)._eventHistory).to.eql({commands: []});
    (d as any)._eventHistory.testCommand = ['1', '2', '3'];
    expect(await d.getLogEvents('testCommandDummy')).to.eql({});
  });

  it('should filter with multiple event keys', async function () {
    const d = new BaseDriver({} as InitialOpts);
    expect((d as any)._eventHistory).to.eql({commands: []});
    (d as any)._eventHistory.testCommand = ['1', '2', '3'];
    (d as any)._eventHistory.testCommand2 = ['4', '5'];
    expect(await d.getLogEvents(['testCommand', 'testCommand2'])).to.eql({
      testCommand: ['1', '2', '3'],
      testCommand2: ['4', '5'],
    });
  });

  it('should filter with custom events', async function () {
    const d = new BaseDriver({} as InitialOpts);
    expect((d as any)._eventHistory).to.eql({commands: []});
    (d as any)._eventHistory['custom:appiumEvent'] = ['1', '2', '3'];
    expect(await d.getLogEvents(['custom:appiumEvent'])).to.eql({
      'custom:appiumEvent': ['1', '2', '3'],
    });
  });

  it('should not filter with no existed event name', async function () {
    const d = new BaseDriver({} as InitialOpts);
    expect((d as any)._eventHistory).to.eql({commands: []});
    (d as any)._eventHistory.testCommand = ['1', '2', '3'];
    expect(await d.getLogEvents(['noEventName'])).to.eql({});
  });
});
