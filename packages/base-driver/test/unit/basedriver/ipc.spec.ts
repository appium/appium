import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import B from 'bluebird';
import {AppiumIpc} from '../../../lib/basedriver/ipc';

chai.use(chaiAsPromised);

describe('AppiumIpc', function () {
  describe('subscriptionExists', function () {
    it('should return false when no topic exists', async function () {
      const ipc = new AppiumIpc();
      expect(ipc.subscriptionExists('foo', 'bar')).to.eql(false);
    });
    it('should return false when topic exists but no subscriber', async function () {
      const ipc = new AppiumIpc();
      ipc._subscriptions.foo = [{subscriberName: 'bar', cb: () => {}}];
      expect(ipc.subscriptionExists('foo', 'baz')).to.eql(false);
    });
    it('should return true when subscriber is subscribed', async function () {
      const ipc = new AppiumIpc();
      ipc._subscriptions.foo = [{subscriberName: 'bar', cb: () => {}}];
      expect(ipc.subscriptionExists('foo', 'bar')).to.eql(true);
    });
  });

  describe('subscribe', function () {
    it('should throw if subscription already exists', async function () {
      const ipc = new AppiumIpc();
      ipc._subscriptions.foo = [{subscriberName: 'bar', cb: () => {}}];
      await expect(ipc.subscribe('foo', 'bar', () => {})).to.be.rejected;
    });
    it('should add to list of subscriptions', async function () {
      const ipc = new AppiumIpc();
      expect(ipc._subscriptions.foo).to.be.undefined;
      await ipc.subscribe('foo', 'bar', () => {});
      expect(ipc._subscriptions.foo).to.have.length(1);
    });
  });

  describe('unsubscribe', function () {
    it('should remove from list of subscriptions', async function () {
      const ipc = new AppiumIpc();
      await ipc.subscribe('foo', 'bar', () => {});
      expect(ipc._subscriptions.foo).to.have.length(1);
      await ipc.unsubscribe('foo', 'bar');
      expect(ipc._subscriptions.foo).to.have.length(0);
    });
  });

  describe('publish', function () {
    it('should publish messages to all subscribers', async function () {
      const ipc = new AppiumIpc();
      let sub1Res = {};
      let sub2Res = {};
      const payload = {some: {cool: 'obj'}};
      await ipc.subscribe('foo', 'bar', (publisher, message) => {
        sub1Res = {publisher, message};
      });
      await ipc.subscribe('foo', 'baz', (publisher, message) => {
        sub2Res = {publisher, message};
      });
      await ipc.publish('foo', 'zowee', payload);
      expect(sub1Res).to.eql({publisher: 'zowee', message: payload});
      expect(sub2Res).to.eql({publisher: 'zowee', message: payload});
    });

    it('should not care if the subscription callback throws', async function () {
      const ipc = new AppiumIpc();
      let sub1Res = {};
      const payload = {some: {cool: 'obj'}};
      await ipc.subscribe('foo', 'bar', (publisher, message) => {
        throw new Error('blarg');
      });
      await ipc.publish('foo', 'zowee', payload);
      expect(sub1Res).to.eql({});
    });

    it('should not publish messages to the publisher', async function () {
      const ipc = new AppiumIpc();
      let sub1Res = {};
      let sub2Res = {};
      const payload = {some: {cool: 'obj'}};
      await ipc.subscribe('foo', 'bar', (publisher, message) => {
        sub1Res = {publisher, message};
      });
      await ipc.subscribe('foo', 'baz', (publisher, message) => {
        sub2Res = {publisher, message};
      });
      await ipc.publish('foo', 'bar', payload);
      expect(sub1Res).to.eql({});
      expect(sub2Res).to.eql({publisher: 'bar', message: payload});
    });
  });

  describe('getMessages', function () {
    it('should get messages previously published, even if previously retrieved', async function () {
      const ipc = new AppiumIpc();
      const payload1 = {hello: 'world'};
      const payload2 = 3;
      await ipc.publish('foo', 'bar', payload1);
      await ipc.publish('foo', 'baz', payload2);
      await ipc.publish('other', 'bar', 5); // should not get message published on other topic
      expect(await ipc.getMessages('foo')).to.eql([
        {publisherName: 'bar', message: payload1},
        {publisherName: 'baz', message: payload2},
      ]);
    });
  });
});
