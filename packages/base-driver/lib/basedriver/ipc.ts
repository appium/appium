import AsyncLock from 'async-lock';
import {log} from './logger';
import type {StringRecord, IIpcSubscription, IAppiumIpc, IpcMessage, IpcEvent} from '@appium/types';
import EventEmitter from 'node:events';
import {node} from '@appium/support';

const SUB_LOCK_KEY = 'subscriptions';
const MSG_LOCK_KEY = 'messages';

const DEF_MAX_OBJ_SIZE_BYTES = 1024 * 1024; // 1mb seems like plenty for any plugin to pass a message

export const EVT_MESSAGE = 'message';

export type AppiumIpcOpts = {
  maxObjSize: number;
};

export class AppiumIpc implements IAppiumIpc {
  protected readonly _messages: StringRecord<IpcMessage<any>> = {};
  protected readonly _subscriptions: StringRecord<Array<IpcSubscription<any>>> = {};
  protected readonly _lock: AsyncLock = new AsyncLock();
  protected readonly _maxObjSize: number;

  constructor (opts: AppiumIpcOpts = {maxObjSize: DEF_MAX_OBJ_SIZE_BYTES}) {
    this._maxObjSize = opts.maxObjSize;
    log.info(`Initialized new IPC object with max object size of ${this._maxObjSize} bytes`);
  }

  async subscribe<T>(topic: string, subscriberName: string): Promise<IpcSubscription<T>> {
    log.info(`Subscribing ${subscriberName} to topic '${topic}'`);
    return await this._lock.acquire(SUB_LOCK_KEY, async () => {
      if (this.subscriptionExists(topic, subscriberName)) {
        throw new Error(`Subscription already exists for topic "${topic}" and subscriber "${subscriberName}"`);
      }

      this._subscriptions[topic] ??= [];
      const sub = new IpcSubscription<T>(subscriberName, topic, this);
      this._subscriptions[topic].push(sub);
      return sub;
    });
  }

  async unsubscribe(topic: string, subscriberName: string): Promise<boolean> {
    log.info(`Unsubscribing ${subscriberName} from topic '${topic}'`);
    return await this._lock.acquire(SUB_LOCK_KEY, async () => {
      if (this.subscriptionExists(topic, subscriberName)) {
        this._subscriptions[topic] = this._subscriptions[topic].filter((sub) => sub.subscriberName !== subscriberName);
        return true;
      }
      return false;
    });
  }

  async publish<T>(topic: string, publisherName: string, data: T): Promise<void> {
    log.debug(`${publisherName} is publishing a message to topic ${topic}`);

    const messageSize = node.getObjectSize(data);
    if (messageSize > this._maxObjSize) {
      throw new Error(`Message with size ${messageSize} bytes is bigger than max size of ${this._maxObjSize} bytes`);
    }

    const message: IpcMessage<T> = {publisherName, data: structuredClone(data), topic, timestamp_ms: Date.now()};

    await this._lock.acquire(MSG_LOCK_KEY, async () => {
      this._messages[topic] = message;
    });

    const subs: IpcSubscription<T>[] = await this._lock.acquire(SUB_LOCK_KEY, () =>
      this._subscriptions[topic] ?
        this._subscriptions[topic].filter((sub) => sub.subscriberName !== publisherName) :
        []
    );

    for (const sub of subs) {
      sub.emit(EVT_MESSAGE, this.messageForPublish(message));
    }

  }

  async getMessage<T>(topic: string): Promise<IpcMessage<T> | undefined> {
    return await this._lock.acquire(MSG_LOCK_KEY, () => {
      if (!this._messages[topic]) {
        return;
      }

      return this.messageForPublish(this._messages[topic] as IpcMessage<T>);
    });
  }

  private subscriptionExists(topic: string, subscriberName: string): boolean {
    // this is a private helper function only called by methods which already have the subscription
    // lock so we don't need to worry about locking here
    return !!this._subscriptions[topic]?.find((sub) => sub.subscriberName === subscriberName);
  }

  private messageForPublish<T>(message: IpcMessage<T>): IpcMessage<T> {
    return structuredClone({
      ...message,
      publisherName: message.publisherName.split('@')[0]
    });
  }

}

export class IpcSubscription<T> extends EventEmitter<IpcEvent<T>> implements IIpcSubscription<T> {
  subscriberName: string;
  topic: string;

  private ipc: AppiumIpc;

  constructor(subscriberName: string, topic: string, ipc: AppiumIpc) {
    super();
    this.subscriberName = subscriberName;
    this.topic = topic;
    this.ipc = ipc;
  }

  async getMessage(): Promise<IpcMessage<T> | undefined> {
    return await this.ipc.getMessage<T>(this.topic);
  }

  async publish(data: T): Promise<void> {
    return await this.ipc.publish<T>(this.topic, this.subscriberName, data);
  }

  async unsubscribe(): Promise<boolean> {
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
