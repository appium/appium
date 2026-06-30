import type { IpcMessage } from '@appium/types';
import { sleep } from 'asyncbox';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { describe, it } from 'node:test';
import { AppiumIpc, EVT_MESSAGE } from '../../../lib/basedriver/ipc';

chai.use(chaiAsPromised);

describe('AppiumIpc', function () {
  describe('subscriptionExists', function () {
    it('should return false when no topic exists', function () {
      const ipc = new AppiumIpc();
      expect(ipc.subscriptionExists('foo', 'bar')).to.eql(false);
    });
    it('should return false when topic exists but no subscriber', function () {
      const ipc = new AppiumIpc();
      ipc.subscribe('foo', 'bar');
      expect(ipc.subscriptionExists('foo', 'baz')).to.eql(false);
    });
    it('should return true when subscriber is subscribed', function () {
      const ipc = new AppiumIpc();
      ipc.subscribe('foo', 'bar');
      expect(ipc.subscriptionExists('foo', 'bar')).to.eql(true);
    });
  });

  describe('subscribe', function () {
    it('should throw if subscription already exists', function () {
      const ipc = new AppiumIpc();
      ipc.subscribe('foo', 'bar');
      expect(() => ipc.subscribe('foo', 'bar')).to.throw;
    });

    it('should throw when subscribing to a new topic beyond the limit', function () {
      const ipc = new AppiumIpc({ maxTopics: 2 });
      ipc.subscribe('topic1', 'sub1');
      ipc.subscribe('topic2', 'sub2');
      expect(() => ipc.subscribe('topic3', 'sub3')).to.throw(/2/);
    });

    it('should allow multiple subscribers on the same topic without counting extra topics', function () {
      const ipc = new AppiumIpc({ maxTopics: 2 });
      ipc.subscribe('topic1', 'sub1');
      ipc.subscribe('topic1', 'sub2');
      ipc.subscribe('topic2', 'sub3');
      expect(() => ipc.subscribe('topic3', 'sub4')).to.throw(/2/);
    });

    it('should mention --max-ipc-topics in the error when the topic limit is reached', function () {
      const ipc = new AppiumIpc({ maxTopics: 1 });
      ipc.subscribe('topic1', 'sub1');
      expect(() => ipc.subscribe('topic2', 'sub2')).to.throw(
        /Cannot create new IPC topic 'topic2': maximum of 1 topics per session reached\. Adjust with the --max-ipc-topics server arg\./,
      );
    });
  });

  describe('unsubscribe', function () {
    it('should remove from list of subscriptions', function () {
      const ipc = new AppiumIpc();
      ipc.subscribe('foo', 'bar');
      expect(ipc.subscriptionExists('foo', 'bar')).to.be.true;
      ipc.unsubscribe('foo', 'bar');
      expect(ipc.subscriptionExists('foo', 'bar')).to.be.false;
    });

    it('should unsubscribe via subscription object', function () {
      const ipc = new AppiumIpc();
      const sub = ipc.subscribe('foo', 'bar');
      expect(ipc.subscriptionExists('foo', 'bar')).to.be.true;
      sub.unsubscribe();
      expect(ipc.subscriptionExists('foo', 'bar')).to.be.false;
    });
  });

  describe('publish', function () {
    it('should publish messages to all subscribers', async function () {
      const ipc = new AppiumIpc();
      const payload = { some: { cool: 'obj' } };
      let sub1Res: IpcMessage<typeof payload>;
      let sub2Res: IpcMessage<typeof payload>;
      const sub1 = ipc.subscribe('foo', 'bar');
      const sub2 = ipc.subscribe('foo', 'baz');
      sub1.on(EVT_MESSAGE, (message) => (sub1Res = message as IpcMessage<typeof payload>));
      sub2.on(EVT_MESSAGE, (message) => (sub2Res = message as IpcMessage<typeof payload>));
      await ipc.publish('foo', 'zowee', payload);

      expect(sub1Res!.data).to.eql(payload);
      expect(sub2Res!.data).to.eql(payload);

      expect(sub1Res!.publisher).to.eql('zowee');
      expect(sub2Res!.publisher).to.eql('zowee');

      expect(sub1Res!.topic).to.eql('foo');
      expect(sub2Res!.topic).to.eql('foo');

      expect(sub1Res!).to.have.property('timestampMs');
      expect(sub2Res!).to.have.property('timestampMs');
    });

    it('should not publish messages to the publisher', async function () {
      const ipc = new AppiumIpc();
      const payload = { some: { cool: 'obj' } };
      let sub1Res: IpcMessage<typeof payload>;
      let sub2Res: IpcMessage<typeof payload>;
      const sub1 = ipc.subscribe('foo', 'bar');
      const sub2 = ipc.subscribe('foo', 'baz');
      sub1.on(EVT_MESSAGE, (message) => (sub1Res = message as IpcMessage<typeof payload>));
      sub2.on(EVT_MESSAGE, (message) => (sub2Res = message as IpcMessage<typeof payload>));
      await ipc.publish('foo', 'baz', payload);

      expect(sub2Res!).to.not.exist;
      expect(sub1Res!.data).to.eql(payload);
      expect(sub1Res!.publisher).to.eql('baz');
    });

    it('should publish using subscription object', async function () {
      const ipc = new AppiumIpc();
      const payload = { some: { cool: 'obj' } };
      let sub1Res: IpcMessage<typeof payload>;
      const sub1 = ipc.subscribe('foo', 'bar');
      const sub2 = ipc.subscribe('foo', 'baz');
      sub1.on(EVT_MESSAGE, (message) => (sub1Res = message as IpcMessage<typeof payload>));
      await sub2.publish(payload);

      expect(sub1Res!.data).to.eql(payload);
      expect(sub1Res!.publisher).to.eql('baz');
      expect(sub1Res!.topic).to.eql('foo');
      expect(sub1Res!).to.have.property('timestampMs');
    });

    it('should not publish to unsubscribed subscribers', async function () {
      const ipc = new AppiumIpc();
      const sub1 = ipc.subscribe<boolean>('foo', 'bar');
      let sub1Res: boolean = false;
      sub1.on(EVT_MESSAGE, (message) => (sub1Res = message.data));
      sub1.unsubscribe();
      await ipc.publish<boolean>('foo', 'baz', true);
      expect(sub1Res).to.be.false;
    });

    it('should not allow publish from subscription object after unsubscribing', async function () {
      const ipc = new AppiumIpc();
      const sub1 = ipc.subscribe<boolean>('foo', 'bar');
      sub1.unsubscribe();
      await expect(sub1.publish(true)).to.eventually.be.rejectedWith(
        /Cannot publish data to topic from subscription after unsubscribing/,
      );
    });

    it('should be no race conditions with publishing and unsubscribing', async function () {
      const ipc = new AppiumIpc();
      const payload = { some: { cool: 'obj' } };
      let rcvdCount = 0;
      const sub1 = ipc.subscribe<typeof payload>('foo', 'bar');
      sub1.on(EVT_MESSAGE, () => {
        rcvdCount++;
      });
      const promises = [];
      promises.push(ipc.publish('foo', 'baz', payload)); // intentionally call without awaiting
      sub1.unsubscribe(); // intentionally call without awaiting
      promises.push(ipc.publish('foo', 'baz', payload)); // intentionally call without awaiting
      // now that we've fired off a couple publishes, let's unsubscribe
      await sleep(10);
      expect(rcvdCount).to.eql(1); // not 0 or 2
      await Promise.all(promises);
    });

    it('should allow running ipc commands in publish event callback', async function () {
      const ipc = new AppiumIpc();
      const payload = { some: { cool: 'obj' } };
      let sub1Res: IpcMessage<typeof payload>;
      let sub1Res2: IpcMessage<typeof payload> | undefined;
      const sub1 = ipc.subscribe('foo', 'bar');
      sub1.on(EVT_MESSAGE, async (message) => {
        sub1Res = message as IpcMessage<typeof payload>;
        sub1Res2 = ipc.getMessage<typeof payload>('foo');
      });
      await ipc.publish('foo', 'baz', payload);
      await sleep(0); // just spin once to let the publish callback do its thing
      expect(sub1Res!.data).to.eql(payload);
      expect(sub1Res!.publisher).to.eql('baz');
      expect(sub1Res2!.data).to.eql(payload);
      expect(sub1Res2!.publisher).to.eql('baz');
    });

    it('should throw an error when trying to publish a large message', async function () {
      const ipc = new AppiumIpc({ maxObjSize: 20 }); // very small message size
      const payload1 = 'hi'; // not so many bytes
      const payload2 = 'helloworld!'.repeat(100); // lotsa bytes
      await expect(ipc.publish('foo', 'bar', payload1)).to.eventually.eql(undefined);
      await expect(ipc.publish('foo', 'bar', payload2)).to.eventually.be.rejectedWith(/20/);
    });

    it('should throw an error when publishing to a new topic beyond the limit', async function () {
      const ipc = new AppiumIpc({ maxTopics: 2 });
      await ipc.publish('topic1', 'pub', true);
      await ipc.publish('topic2', 'pub', true);
      await expect(ipc.publish('topic3', 'pub', true)).to.eventually.be.rejectedWith(/2/);
    });

    it('should count publish-only topics toward the limit without a prior subscribe', async function () {
      const ipc = new AppiumIpc({ maxTopics: 2 });
      await ipc.publish('topic1', 'pub', true);
      ipc.subscribe('topic2', 'sub');
      await expect(ipc.publish('topic3', 'pub', true)).to.eventually.be.rejectedWith(/--max-ipc-topics/);
    });

    it('should not allow sharing actual published object, only copies', async function () {
      const ipc = new AppiumIpc();
      const payload = { foo: 'bar' };
      type MsgType = typeof payload;
      const sub1 = ipc.subscribe<MsgType>('foo', 'sub1');
      const sub2 = ipc.subscribe<MsgType>('foo', 'sub2');
      sub1.on('message', ({ data }) => {
        expect(data).to.eql({ foo: 'bar' });
        data.foo = 'bad';
      });
      sub2.on('message', ({ data }) => {
        expect(data).to.eql({ foo: 'bar' });
        data.foo = 'bad2';
      });
      await ipc.publish<MsgType>('foo', 'pub1', payload);
      await sleep(0);

      // allowing subscribers to change the data they received should not change the original obj
      expect(payload).to.eql({ foo: 'bar' });

      // changing original object should not change what was published
      payload.foo = 'new';
      expect(sub1.getMessage()!.data).to.eql({ foo: 'bar' });
    });
  });

  describe('getMessage', function () {
    it('should get the message previously published, even if previously retrieved', async function () {
      const ipc = new AppiumIpc();
      const payload1 = { hello: 'world' };
      const payload2 = 3;
      await ipc.publish('foo', 'bar', payload1);
      await ipc.publish('foo', 'baz', payload2);
      await ipc.publish('other', 'bar', 5); // should not get message published on other topic
      expect(ipc.getMessage('foo')!.data).to.eql(payload2);
    });

    it('should get the message from the subscription object', async function () {
      const ipc = new AppiumIpc();
      const payload1 = { hello: 'world' };
      type PayloadType = typeof payload1;
      const sub1 = ipc.subscribe<PayloadType>('foo', 'bar');
      const sub2 = ipc.subscribe<PayloadType>('foo', 'baz');
      await sub1.publish(payload1);
      expect(sub2.getMessage()!.data).to.eql(payload1);
    });

    it('should be no race conditions with publishing', async function () {
      const ipc = new AppiumIpc();
      const p = ipc.publish('foo', 'bar', true); // intentionally avoid waiting
      const msg = ipc.getMessage('foo');
      expect(msg!.data).to.eql(true);
      await p; // just make sure promise is done
    });

    it('should not allow getting message from subscription object after unsubscribing', function () {
      const ipc = new AppiumIpc();
      const sub1 = ipc.subscribe<boolean>('foo', 'bar');
      sub1.unsubscribe();
      expect(() => sub1.getMessage()).to.throw;
    });

    it('should get messages from the async iterator of the subscription object', async function () {
      const ipc = new AppiumIpc();
      const payload1 = { hello: 'world' };
      const payload2 = { hello: 'goodbye' };
      const payload3 = { hello: 'everyone' };
      type PayloadType = { hello: string };
      const received: PayloadType[] = [];
      const sub1 = ipc.subscribe<PayloadType>('foo', 'bar');
      const sub2 = ipc.subscribe<PayloadType>('foo', 'baz');

      const sendLoop = async () => {
        await sleep(50);
        await sub1.publish(payload1);
        await sub1.publish(payload2);
        await sub1.publish(payload3);
      };

      const rcvLoop = async () => {
        let i = 0;
        for await (const message of sub2) {
          i++;
          expect(message.publisher).to.eql('bar');
          expect(message.topic).to.eql('foo');
          received.push(message.data);
          if (i >= 3) {
            break;
          }
        }
      };

      await Promise.all([rcvLoop(), sendLoop()]);
      expect(received).to.eql([payload1, payload2, payload3]);
    });

    it('should stop async iterator after unsubscribe', async function () {
      const ipc = new AppiumIpc();
      const payload1 = { hello: 'world' };
      const payload2 = { hello: 'goodbye' };
      const payload3 = { hello: 'everyone' };
      type PayloadType = { hello: string };
      const received: PayloadType[] = [];
      const sub1 = ipc.subscribe<PayloadType>('foo', 'bar');
      const sub2 = ipc.subscribe<PayloadType>('foo', 'baz');

      const sendLoop = async () => {
        await sleep(20);
        await sub1.publish(payload1);
        await sleep(20);
        sub2.unsubscribe(); // unsubscribe the receiver here but keep publishing
        await sub1.publish(payload2);
        await sub1.publish(payload3);
      };

      const rcvLoop = async () => {
        for await (const message of sub2) {
          expect(message.publisher).to.eql('bar');
          expect(message.topic).to.eql('foo');
          received.push(message.data);
        }
      };

      await Promise.all([rcvLoop(), sendLoop()]);
      expect(received).to.eql([payload1]); // should only have one payload since we unsubscribed
    });
  });

  describe('isActive', function () {
    it('should tell the truth about subscription status', function () {
      const ipc = new AppiumIpc();
      const sub1 = ipc.subscribe<boolean>('foo', 'bar');
      expect(sub1.isActive).to.be.true;
      sub1.unsubscribe();
      expect(sub1.isActive).to.be.false;
    });
  });
});
