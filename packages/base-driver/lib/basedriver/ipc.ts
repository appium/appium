import AsyncLock from 'async-lock';
import {log} from './logger';
import type {StringRecord, IpcSubscribeCallback, IAppiumIpc, IpcSubscription, IpcMessage} from '@appium/types';

const SUB_LOCK_KEY = 'subscriptions';
const MSG_LOCK_KEY = 'messages';

export class AppiumIpc implements IAppiumIpc {
  protected readonly _messages: StringRecord<Array<IpcMessage<any>>> = {};
  protected readonly _subscriptions: StringRecord<Array<IpcSubscription<any>>> = {};
  protected readonly _lock: AsyncLock;

  constructor () {
    this._lock = new AsyncLock();
  }

  async subscribe<T>(topic: string, subscriberName: string, cb: IpcSubscribeCallback<T>): Promise<void> { // eslint-disable-line promise/prefer-await-to-callbacks
    log.info(`Subscribing ${subscriberName} to topic '${topic}'`);
    return await this._lock.acquire(SUB_LOCK_KEY, async () => {
      if (this.subscriptionExists(topic, subscriberName)) {
        throw new Error(`Subscription already exists for topic "${topic}" and subscriber "${subscriberName}"`);
      }

      if (!this._subscriptions[topic]) {
        this._subscriptions[topic] = [];
      }
      this._subscriptions[topic].push({subscriberName, cb});
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
    await this._lock.acquire(MSG_LOCK_KEY, async () => {
      if (!this._messages[topic]) {
        this._messages[topic] = [];
      }

      // TODO message array should be a queue that removes items when size grows too large
      this._messages[topic].push({publisherName, message});
    });

    const subs: IpcSubscription<T>[] = await this._lock.acquire(SUB_LOCK_KEY, () =>
      this._subscriptions[topic] ?
        this._subscriptions[topic].filter((sub) => sub.subscriberName !== publisherName) :
        []
    );

    await Promise.all(subs.map(async (sub) => { // eslint-disable-line promise/prefer-await-to-callbacks
      try {
        await sub.cb(publisherName, message); // eslint-disable-line promise/prefer-await-to-callbacks
      } catch (e) {
        log.error(`Error in IPC subscription callback for subscriber ${sub.subscriberName} on `
                  + `topic ${topic}: ${e}`);
      }
    }));

  }

  async getMessages<T>(topic: string): Promise<IpcMessage<T>[]> {
    return await this._lock.acquire(MSG_LOCK_KEY, () => {
      if (!this._messages[topic]) {
        return [];
      }

      return structuredClone(this._messages[topic] as Array<IpcMessage<T>>);
    });
  }

  private subscriptionExists(topic: string, subscriberName: string): boolean {
    // this is a private helper function only called by methods which already have the subscription
    // lock so we don't need to worry about locking here
    return !!this._subscriptions[topic]?.find((sub) => sub.subscriberName === subscriberName);
  }

}
