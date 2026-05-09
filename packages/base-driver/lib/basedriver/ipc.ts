import AsyncLock from 'async-lock';
import {log} from './logger';
import type {StringRecord, IIpcSubscription, IAppiumIpc, IpcMessage, IpcEvent, IpcPublisher} from '@appium/types';
import EventEmitter from 'node:events';
import {node} from '@appium/support';

const SUB_LOCK_KEY = 'subscriptions';
const MSG_LOCK_KEY = 'messages';

const DEF_MAX_OBJ_SIZE_BYTES = 1024 * 1024; // 1mb seems like plenty for any plugin to pass a message

export const EVT_MESSAGE = 'message';

export type AppiumIpcOpts = {
  maxObjSize: number;
};

export class IpcSubscription<T> extends EventEmitter<IpcEvent<T>> implements IIpcSubscription<T> {

  private isSubscribed = true;

  constructor(
    public readonly subscriberName: string,
    public readonly topic: string,
    private readonly ipc: AppiumIpc
  ) {
    super();
  }

  async getMessage(): Promise<IpcMessage<T> | undefined> {
    return await this.ipc.getMessage<T>(this.topic);
  }

  async publish(data: T): Promise<void> {
    return await this.ipc.publish<T>(this.topic, this.subscriberName, data);
  }

  async unsubscribe(): Promise<boolean> {
    this.isSubscribed = false;
    return await this.ipc.unsubscribe(this.topic, this.subscriberName);
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<IpcMessage<T>> {
    while (this.isSubscribed) {
      const nextVal = await new Promise((resolve) => {
        this.once(EVT_MESSAGE, resolve);
      });
      yield nextVal as IpcMessage<T>;
    }
  }
}

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

    let clonedData: T;
    try {
      clonedData = structuredClone(data);
    } catch (e) {
      log.error(`Could not clone data for IPC publish from ${publisherName} on topic ${topic}`, e);
      throw e;
    }

    const message: IpcMessage<T> = {publisher: this.getIpcPublisher(publisherName), data: clonedData, topic, timestampMs: Date.now()};

    this._messages[topic] = message;

    const subs: IpcSubscription<T>[] = await this._lock.acquire(SUB_LOCK_KEY, () =>
      this._subscriptions[topic] ?
        this._subscriptions[topic].filter((sub) => sub.subscriberName !== publisherName) :
        []
    );

    for (const sub of subs) {
      sub.emit(EVT_MESSAGE, structuredClone(message));
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
    return !!this._subscriptions[topic]?.some((sub) => sub.subscriberName === subscriberName);
  }

  private getIpcPublisher(rawName: string): IpcPublisher {
    return {
      name: rawName.split('@')[0],
      id: rawName,
    };
  }
}

