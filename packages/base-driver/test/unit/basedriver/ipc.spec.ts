import B from 'bluebird';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {AppiumIpc, EVT_MESSAGE} from '../../../lib/basedriver/ipc';
import type {IpcMessage} from '@appium/types';

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

      expect(sub1Res!.data).to.eql(payload);
      expect(sub2Res!.data).to.eql(payload);

      expect(sub1Res!.publisher.name).to.eql('zowee');
      expect(sub2Res!.publisher.name).to.eql('zowee');

      expect(sub1Res!.topic).to.eql('foo');
      expect(sub2Res!.topic).to.eql('foo');

      expect(sub1Res!).to.have.property('timestamp_ms');
      expect(sub2Res!).to.have.property('timestamp_ms');
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
      expect(sub1Res!.data).to.eql(payload);
      expect(sub1Res!.publisher.name).to.eql('baz');
    });

    it('should publish using subscription object', async function () {
      const ipc = new AppiumIpc();
      const payload = {some: {cool: 'obj'}};
      let sub1Res: IpcMessage<typeof payload>;
      const sub1 = await ipc.subscribe('foo', 'bar');
      const sub2 = await ipc.subscribe('foo', 'baz');
      sub1.on(EVT_MESSAGE, (message) => sub1Res = message);
      await sub2.publish(payload);

      expect(sub1Res!.data).to.eql(payload);
      expect(sub1Res!.publisher.name).to.eql('baz');
      expect(sub1Res!.topic).to.eql('foo');
      expect(sub1Res!).to.have.property('timestamp_ms');
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
      expect(sub1Res!.data).to.eql(payload);
      expect(sub1Res!.publisher.name).to.eql('baz');
      expect(sub1Res2!.data).to.eql(payload);
      expect(sub1Res2!.publisher.name).to.eql('baz');
    });

    it('should throw an error when trying to publish a large message', async function () {
      const ipc = new AppiumIpc({maxObjSize: 20}); // very small message size
      const payload1 = 'hi'; // not so many bytes
      const payload2 = 'helloworld!'.repeat(100); // lotsa bytes
      await expect(ipc.publish('foo', 'bar', payload1)).to.eventually.eql(undefined);
      await expect(ipc.publish('foo', 'bar', payload2)).to.eventually.be.rejectedWith(/20/);
    });

    it('should not allow sharing actual published object, only copies', async function () {
      const ipc = new AppiumIpc();
      const payload = {foo: 'bar'};
      type MsgType = typeof payload;
      const sub1 = await ipc.subscribe<MsgType>('foo', 'sub1');
      const sub2 = await ipc.subscribe<MsgType>('foo', 'sub2');
      sub1.on('message', ({data}) => {
        expect(data).to.eql({foo: 'bar'});
        data.foo = 'bad';
      });
      sub2.on('message', ({data}) => {
        expect(data).to.eql({foo: 'bar'});
        data.foo = 'bad2';
      });
      await ipc.publish<MsgType>('foo', 'pub1', payload);
      await B.delay(0);

      // allowing subscribers to change the data they received should not change the original obj
      expect(payload).to.eql({foo: 'bar'});

      // changing original object should not change what was published
      payload.foo = 'new';
      expect((await sub1.getMessage())!.data).to.eql({foo: 'bar'});

    });

    it('should not include unique object info in the publisher name', async function () {
      const ipc = new AppiumIpc();
      const sub1 = await ipc.subscribe<number>('foo', 'subscriber1@1234');
      const sub2 = await ipc.subscribe<number>('foo', 'subscriber2@1234');
      let rcvd: IpcMessage<number>;
      sub1.on('message', (data) => rcvd = data);
      await ipc.publish<number>('foo', 'publisher@1234', 5);
      await B.delay(0);
      expect(rcvd!.publisher.name).to.eql('publisher');
      expect(rcvd!.data).to.eql(5);

      sub2.on('message', (data) => rcvd = data);
      await sub1.publish(3);
      await B.delay(0);
      expect(rcvd!.publisher.name).to.eql('subscriber1');
      expect(rcvd!.data).to.eql(3);

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
      expect((await ipc.getMessage('foo'))!.data).to.eql(payload2);
    });

    it('should get the message from the subscription object', async function () {
      const ipc = new AppiumIpc();
      const payload1 = {hello: 'world'};
      type PayloadType = typeof payload1;
      const sub1 = await ipc.subscribe<PayloadType>('foo', 'bar');
      const sub2 = await ipc.subscribe<PayloadType>('foo', 'baz');
      await sub1.publish(payload1);
      expect((await sub2.getMessage())!.data).to.eql(payload1);
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
          expect(message.publisher.name).to.eql('bar');
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

    it('should not include unique publisher name', async function () {
      const ipc = new AppiumIpc();
      const sub1 = await ipc.subscribe<number>('foo', 'subscriber1@1234');
      await ipc.publish<number>('foo', 'publisher@1234', 5);
      const {publisher} = await sub1.getMessage() ?? {publisher: null};
      expect(publisher?.name).to.eql('publisher');
    });
  });
});
