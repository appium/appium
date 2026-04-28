import AsyncLock from 'async-lock';
import {log} from './logger';
import type {StringRecord, IIpcSubscription, IAppiumIpc, IpcMessage} from '@appium/types';
import EventEmitter from 'node:events';

const SUB_LOCK_KEY = 'subscriptions';
const MSG_LOCK_KEY = 'messages';

export const EVT_MESSAGE = 'message';

export class AppiumIpc implements IAppiumIpc {
  protected readonly _messages: StringRecord<IpcMessage<any>> = {};
  protected readonly _subscriptions: StringRecord<Array<IpcSubscription<any>>> = {};
  protected readonly _lock: AsyncLock;

  constructor () {
    this._lock = new AsyncLock();
  }

  async subscribe<T>(topic: string, subscriberName: string): Promise<IpcSubscription<T>> { // eslint-disable-line promise/prefer-await-to-callbacks
    log.info(`Subscribing ${subscriberName} to topic '${topic}'`);
    return await this._lock.acquire(SUB_LOCK_KEY, async () => {
      if (this.subscriptionExists(topic, subscriberName)) {
        throw new Error(`Subscription already exists for topic "${topic}" and subscriber "${subscriberName}"`);
      }

      if (!this._subscriptions[topic]) {
        this._subscriptions[topic] = [];
      }
      const sub = new IpcSubscription<T>(subscriberName, topic, this);
      this._subscriptions[topic].push(sub);
      return sub;
    });
  }

  async unsubscribe(topic: string, subscriberName: string): Promise<void> {
    log.info(`Unsubscribing ${subscriberName} from topic '${topic}'`);
    await this._lock.acquire(SUB_LOCK_KEY, async () => {
      if (this.subscriptionExists(topic, subscriberName)) {
        this._subscriptions[topic] = this._subscriptions[topic].filter((sub) => sub.subscriberName !== subscriberName);
      }
    });
  }

  async publish<T>(topic: string, publisherName: string, message: T): Promise<void> {
    log.info(`${publisherName} is publishing a message to topic ${topic}`);

    const data: IpcMessage<T> = {publisherName, message, topic, timestamp: Date.now()};

    await this._lock.acquire(MSG_LOCK_KEY, async () => {
      // TODO message array should be a queue that removes items when size grows too large
      this._messages[topic] = data;
    });

    const subs: IpcSubscription<T>[] = await this._lock.acquire(SUB_LOCK_KEY, () =>
      this._subscriptions[topic] ?
        this._subscriptions[topic].filter((sub) => sub.subscriberName !== publisherName) :
        []
    );

    for (const sub of subs) {
      sub.emit(EVT_MESSAGE, data);
    }

  }

  async getMessage<T>(topic: string): Promise<IpcMessage<T> | undefined> {
    return await this._lock.acquire(MSG_LOCK_KEY, () => {
      if (!this._messages[topic]) {
        return;
      }

      return structuredClone(this._messages[topic] as IpcMessage<T>);
    });
  }

  private subscriptionExists(topic: string, subscriberName: string): boolean {
    // this is a private helper function only called by methods which already have the subscription
    // lock so we don't need to worry about locking here
    return !!this._subscriptions[topic]?.find((sub) => sub.subscriberName === subscriberName);
  }

}

export class IpcSubscription<T> extends EventEmitter implements IIpcSubscription {
  subscriberName: string;
  topic: string;

  private ipc: AppiumIpc;

  constructor(subscriberName: string, topic: string, ipc: AppiumIpc) {
    super();
    this.subscriberName = subscriberName;
    this.topic = topic;
    this.ipc = ipc;
  }

  async getMessage<T>(): Promise<IpcMessage<T> | undefined> {
    return await this.ipc.getMessage<T>(this.topic);
  }

  async publish<T>(message: T): Promise<void> {
    return await this.ipc.publish<T>(this.topic, this.subscriberName, message);
  }

  async unsubscribe(): Promise<void> {
    return await this.ipc.unsubscribe(this.topic, this.subscriberName);
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<IpcMessage<T>> {
    while (true) {
      const nextVal = await new Promise((resolve) => {
        this.once(EVT_MESSAGE, resolve);
      });
      yield nextVal as IpcMessage<T>;
    }
  }
}
