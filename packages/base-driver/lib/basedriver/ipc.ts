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

  constructor(
    public readonly subscriberId: string,
    public readonly topic: string,
    private readonly ipc: AppiumIpc
  ) {
    super();
  }

  get isSubscribed() {
    return this.ipc.subscriptionExists(this.topic, this.subscriberId);
  }

  async getMessage(): Promise<IpcMessage<T> | undefined> {
    if (!this.isSubscribed) {
      throw new Error('Cannot get message from subscription after unsubscribing');
    }
    return await this.ipc.getMessage<T>(this.topic);
  }

  async publish(data: T): Promise<void> {
    if (!this.isSubscribed) {
      throw new Error('Cannot publish data to topic from subscription after unsubscribing');
    }
    return await this.ipc.publish<T>(this.topic, this.subscriberId, data);
  }

  async unsubscribe(): Promise<boolean> {
    return await this.ipc.unsubscribe(this.topic, this.subscriberId);
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

  async subscribe<T>(topic: string, subscriberId: string): Promise<IpcSubscription<T>> {
    log.info(`Subscribing ${subscriberId} to topic '${topic}'`);
    return await this._lock.acquire(SUB_LOCK_KEY, async () => {
      if (this.subscriptionExists(topic, subscriberId)) {
        throw new Error(`Subscription already exists for topic "${topic}" and subscriber "${subscriberId}"`);
      }

      this._subscriptions[topic] ??= [];
      const sub = new IpcSubscription<T>(subscriberId, topic, this);
      this._subscriptions[topic].push(sub);
      return sub;
    });
  }

  async unsubscribe(topic: string, subscriberId: string): Promise<boolean> {
    log.info(`Unsubscribing ${subscriberId} from topic '${topic}'`);
    return await this._lock.acquire(SUB_LOCK_KEY, async () => {
      if (this.subscriptionExists(topic, subscriberId)) {
        this._subscriptions[topic] = this._subscriptions[topic].filter((sub) => sub.subscriberId !== subscriberId);
        return true;
      }
      return false;
    });
  }

  async publish<T>(topic: string, publisherId: string, data: T): Promise<void> {
    log.debug(`${publisherId} is publishing a message to topic ${topic}`);

    const messageSize = node.getObjectSize(data);
    if (messageSize > this._maxObjSize) {
      throw new Error(`Message with size ${messageSize} bytes is bigger than max size of ${this._maxObjSize} bytes`);
    }

    let clonedData: T;
    try {
      clonedData = structuredClone(data);
    } catch (e) {
      log.error(`Could not clone data for IPC publish from ${publisherId} on topic ${topic}`, e);
      throw e;
    }

    const message: IpcMessage<T> = {publisher: this.getIpcPublisher(publisherId), data: clonedData, topic, timestampMs: Date.now()};

    this._messages[topic] = message;

    const subs: IpcSubscription<T>[] = await this._lock.acquire(SUB_LOCK_KEY, () =>
      this._subscriptions[topic] ?
        this._subscriptions[topic].filter((sub) => sub.subscriberId !== publisherId) :
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

  subscriptionExists(topic: string, subscriberId: string): boolean {
    return !!this._subscriptions[topic]?.some((sub) => sub.subscriberId === subscriberId);
  }

  private getIpcPublisher(rawName: string): IpcPublisher {
    return {
      name: rawName.split('@')[0],
      id: rawName,
    };
  }
}

