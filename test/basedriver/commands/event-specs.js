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
});
