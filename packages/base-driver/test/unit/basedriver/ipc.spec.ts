import {expect} from 'chai';
import B from 'bluebird';
import type {IpcSubscribeCallback, IpcSubscription} from '@appium/types';
import {AppiumIpc} from '../../../lib/basedriver/ipc';

describe('AppiumIpc', function () {
  describe('subscriptionExists', function () {
    it('should return false when no topic exists', function () {
      const ipc = new AppiumIpc();
      expect(ipc.subscriptionExists('foo', 'bar')).to.eql(false);
    });
    it('should return false when topic exists but no subscriber', function () {
      const ipc = new AppiumIpc();
      ipc._subscriptions.foo = [{subscriberName: 'bar', cb: () => {}}];
      expect(ipc.subscriptionExists('foo', 'baz')).to.eql(false);
    });
    it('should return true when subscriber is subscribed', function () {
      const ipc = new AppiumIpc();
      ipc._subscriptions.foo = [{subscriberName: 'bar', cb: () => {}}];
      expect(ipc.subscriptionExists('foo', 'bar')).to.eql(true);
    });
  });

  describe('subscribe', function () {
    it('should throw if subscription already exists', function () {
      const ipc = new AppiumIpc();
      ipc._subscriptions.foo = [{subscriberName: 'bar', cb: () => {}}];
      expect(ipc.subscribe.bind(ipc, 'foo', 'bar', () => {})).to.throw();
    });
    it('should add to list of subscriptions', function () {
      const ipc = new AppiumIpc();
      expect(ipc._subscriptions.foo).to.be.undefined;
      ipc.subscribe('foo', 'bar', () => {});
      expect(ipc._subscriptions.foo).to.have.length(1);
    });
  });

  describe('unsubscribe', function () {
    it('should remove from list of subscriptions', function () {
      const ipc = new AppiumIpc();
      ipc.subscribe('foo', 'bar', () => {});
      expect(ipc._subscriptions.foo).to.have.length(1);
      ipc.unsubscribe('foo', 'bar')
      expect(ipc._subscriptions.foo).to.have.length(0);
    });
  });

  describe('publish', function () {
    it('should publish messages to all subscribers', async function () {
      const ipc = new AppiumIpc();
      let sub1Res = {};
      let sub2Res = {};
      const payload = {some: {cool: 'obj'}};
      ipc.subscribe('foo', 'bar', (publisher, message) => {
        sub1Res = {publisher, message};
      });
      ipc.subscribe('foo', 'baz', (publisher, message) => {
        sub2Res = {publisher, message};
      });
      ipc.publish('foo', 'zowee', payload);
      await B.delay(10);
      expect(sub1Res).to.eql({publisher: 'zowee', message: payload});
      expect(sub2Res).to.eql({publisher: 'zowee', message: payload});
    });

    it('should not publish messages to the publisher', async function () {
      const ipc = new AppiumIpc();
      let sub1Res = {};
      let sub2Res = {};
      const payload = {some: {cool: 'obj'}};
      ipc.subscribe('foo', 'bar', (publisher, message) => {
        sub1Res = {publisher, message};
      });
      ipc.subscribe('foo', 'baz', (publisher, message) => {
        sub2Res = {publisher, message};
      });
      ipc.publish('foo', 'bar', payload);
      await B.delay(10);
      expect(sub1Res).to.eql({});
      expect(sub2Res).to.eql({publisher: 'bar', message: payload});
    });
  });

  describe('getMessages', function () {
    it('should get messages previously published, even if previously retrieved', async function () {
      const ipc = new AppiumIpc();
      const payload1 = {hello: 'world'};
      const payload2 = 3;
      ipc.publish('foo', 'bar', payload1);
      ipc.publish('foo', 'baz', payload2);
      ipc.publish('other', 'bar', 5); // should not get message published on other topic
      expect(ipc.getMessages('foo')).to.eql([
        {publisherName: 'bar', message: payload1},
        {publisherName: 'baz', message: payload2},
      ]);
    });
  });
});
