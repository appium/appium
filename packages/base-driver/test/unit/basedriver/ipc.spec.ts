import B from 'bluebird';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {AppiumIpc, EVT_MESSAGE} from '../../../lib/basedriver/ipc';
import {IpcMessage} from '@appium/types';

chai.use(chaiAsPromised);

describe('AppiumIpc', function () {
  describe('subscriptionExists', function () {
    it('should return false when no topic exists', async function () {
      const ipc = new AppiumIpc();
      expect(ipc.subscriptionExists('foo', 'bar')).to.eql(false);
    });
    it('should return false when topic exists but no subscriber', async function () {
      const ipc = new AppiumIpc();
      await ipc.subscribe('foo', 'bar');
      expect(ipc.subscriptionExists('foo', 'baz')).to.eql(false);
    });
    it('should return true when subscriber is subscribed', async function () {
      const ipc = new AppiumIpc();
      await ipc.subscribe('foo', 'bar');
      expect(ipc.subscriptionExists('foo', 'bar')).to.eql(true);
    });
  });

  describe('subscribe', function () {
    it('should throw if subscription already exists', async function () {
      const ipc = new AppiumIpc();
      await ipc.subscribe('foo', 'bar');
      await expect(ipc.subscribe('foo', 'bar')).to.be.rejected;
    });
  });

  describe('unsubscribe', function () {
    it('should remove from list of subscriptions', async function () {
      const ipc = new AppiumIpc();
      await ipc.subscribe('foo', 'bar');
      expect(ipc.subscriptionExists('foo', 'bar')).to.be.true;
      await ipc.unsubscribe('foo', 'bar');
      expect(ipc.subscriptionExists('foo', 'bar')).to.be.false;
    });

    it('should unsubscribe via subscription object', async function () {
      const ipc = new AppiumIpc();
      const sub = await ipc.subscribe('foo', 'bar');
      expect(ipc.subscriptionExists('foo', 'bar')).to.be.true;
      await sub.unsubscribe();
      expect(ipc.subscriptionExists('foo', 'bar')).to.be.false;
    });
  });

  describe('publish', function () {
    it('should publish messages to all subscribers', async function () {
      const ipc = new AppiumIpc();
      const payload = {some: {cool: 'obj'}};
      let sub1Res: IpcMessage<typeof payload>;
      let sub2Res: IpcMessage<typeof payload>;
      const sub1 = await ipc.subscribe('foo', 'bar');
      const sub2 = await ipc.subscribe('foo', 'baz');
      sub1.on(EVT_MESSAGE, (message) => sub1Res = message);
      sub2.on(EVT_MESSAGE, (message) => sub2Res = message);
      await ipc.publish('foo', 'zowee', payload);

      expect(sub1Res!.message).to.eql(payload);
      expect(sub2Res!.message).to.eql(payload);

      expect(sub1Res!.publisherName).to.eql('zowee');
      expect(sub2Res!.publisherName).to.eql('zowee');

      expect(sub1Res!.topic).to.eql('foo');
      expect(sub2Res!.topic).to.eql('foo');

      expect(sub1Res!).to.have.property('timestamp');
      expect(sub2Res!).to.have.property('timestamp');
    });

    it('should not publish messages to the publisher', async function () {
      const ipc = new AppiumIpc();
      const payload = {some: {cool: 'obj'}};
      let sub1Res: IpcMessage<typeof payload>;
      let sub2Res: IpcMessage<typeof payload>;
      const sub1 = await ipc.subscribe('foo', 'bar');
      const sub2 = await ipc.subscribe('foo', 'baz');
      sub1.on(EVT_MESSAGE, (message) => sub1Res = message);
      sub2.on(EVT_MESSAGE, (message) => sub2Res = message);
      await ipc.publish('foo', 'baz', payload);

      expect(sub2Res!).to.not.exist;
      expect(sub1Res!.message).to.eql(payload);
      expect(sub1Res!.publisherName).to.eql('baz');
    });

    it('should publish using subscription object', async function () {
      const ipc = new AppiumIpc();
      const payload = {some: {cool: 'obj'}};
      let sub1Res: IpcMessage<typeof payload>;
      const sub1 = await ipc.subscribe('foo', 'bar');
      const sub2 = await ipc.subscribe('foo', 'baz');
      sub1.on(EVT_MESSAGE, (message) => sub1Res = message);
      await sub2.publish(payload);

      expect(sub1Res!.message).to.eql(payload);
      expect(sub1Res!.publisherName).to.eql('baz');
      expect(sub1Res!.topic).to.eql('foo');
      expect(sub1Res!).to.have.property('timestamp');
    });

    it('should allow running ipc commands in publish event callback', async function () {
      const ipc = new AppiumIpc();
      const payload = {some: {cool: 'obj'}};
      let sub1Res: IpcMessage<typeof payload>;
      let sub1Res2: IpcMessage<typeof payload> | undefined;
      const sub1 = await ipc.subscribe('foo', 'bar',);
      sub1.on(EVT_MESSAGE, async (message) => {
        sub1Res = message;
        sub1Res2 = await ipc.getMessage<typeof payload>('foo');
      });
      await ipc.publish('foo', 'baz', payload);
      await B.delay(0); // just spin once to let the publish callback do its thing
      expect(sub1Res!.message).to.eql(payload);
      expect(sub1Res!.publisherName).to.eql('baz');
      expect(sub1Res2!.message).to.eql(payload);
      expect(sub1Res2!.publisherName).to.eql('baz');
    });
  });

  describe('getMessage', function () {
    it('should get the message previously published, even if previously retrieved', async function () {
      const ipc = new AppiumIpc();
      const payload1 = {hello: 'world'};
      const payload2 = 3;
      await ipc.publish('foo', 'bar', payload1);
      await ipc.publish('foo', 'baz', payload2);
      await ipc.publish('other', 'bar', 5); // should not get message published on other topic
      expect((await ipc.getMessage('foo'))!.message).to.eql(payload2);
    });

    it('should get the message from the subscription object', async function () {
      const ipc = new AppiumIpc();
      const payload1 = {hello: 'world'};
      type PayloadType = typeof payload1;
      const sub1 = await ipc.subscribe<PayloadType>('foo', 'bar');
      const sub2 = await ipc.subscribe<PayloadType>('foo', 'baz');
      await sub1.publish(payload1);
      expect((await sub2.getMessage())!.message).to.eql(payload1);
    });

    it('should get messages from the async iterator of the subscription object', async function () {
      const ipc = new AppiumIpc();
      const payload1 = {hello: 'world'};
      const payload2 = {hello: 'goodbye'};
      const payload3 = {hello: 'everyone'};
      type PayloadType = {hello: string};
      const received: PayloadType[] = [];
      const sub1 = await ipc.subscribe<PayloadType>('foo', 'bar');
      const sub2 = await ipc.subscribe<PayloadType>('foo', 'baz');

      const sendLoop = async () => {
        await B.delay(0);
        await sub1.publish(payload1);
        await sub1.publish(payload2);
        await sub1.publish(payload3);
      };

      const rcvLoop = async () => {
        let i = 0;
        for await (const message of sub2) {
          i++;
          expect(message.publisherName).to.eql('bar');
          expect(message.topic).to.eql('foo');
          received.push(message.message);
          if (i >= 3) {
            break;
          }
        }
      };

      await Promise.all([rcvLoop(), sendLoop()]);
      expect(received).to.eql([payload1, payload2, payload3]);
    });
  });
});
