import {log} from './logger';
import type {StringRecord, IIpcSubscription, IAppiumIpc, IpcMessage, IpcEvent, IpcPublisher, AppiumLogger} from '@appium/types';
import EventEmitter from 'node:events';
import {node} from '@appium/support';
import {delay} from 'bluebird';

const DEF_MAX_OBJ_SIZE_BYTES = 1024 * 1024; // 1mb seems like plenty for any plugin to pass a message

export const EVT_MESSAGE = 'message';
export const EVT_UNSUBSCRIBED = 'unsubscribed';

export type AppiumIpcOpts = {
  maxObjSize?: number;
  log?: AppiumLogger;
};

class StopIterationError extends Error {};

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

  getMessage(): IpcMessage<T> | undefined {
    if (!this.isSubscribed) {
      throw new Error('Cannot get message from subscription after unsubscribing');
    }
    return this.ipc.getMessage<T>(this.topic);
  }

  async publish(data: T): Promise<void> {
    if (!this.isSubscribed) {
      throw new Error('Cannot publish data to topic from subscription after unsubscribing');
    }
    return await this.ipc.publish<T>(this.topic, this.subscriberId, data);
  }

  unsubscribe(): boolean {
    const unsubscribeRes = this.ipc.unsubscribe(this.topic, this.subscriberId);
    this.emit('unsubscribed');
    return unsubscribeRes;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<IpcMessage<T>> {
    // yield any messages that are emitted, but keep an eye out for an unsubscribed that happens
    // while a caller is waiting on the loop, because we want to exit the loop in case of
    // unsubscription, even if we were already waiting on the next message.
    while (this.isSubscribed) {
      const waitForMessage = new Promise((resolve) => {
        this.once(EVT_MESSAGE, resolve);
      });
      const waitForUnsubscribed = new Promise((resolve, reject) => {
        this.once(EVT_UNSUBSCRIBED, () => reject(new StopIterationError()));
      });
      try {
        const val = await Promise.race([waitForMessage, waitForUnsubscribed]);
        yield val as IpcMessage<T>;
      } catch (e) {
        if (e instanceof StopIterationError) {
          break;
        }
        throw e;
      }
    }
  }
}

export class AppiumIpc implements IAppiumIpc {
  protected readonly _messages: StringRecord<IpcMessage<any>> = {};
  protected readonly _subscriptions: StringRecord<Array<IpcSubscription<any>>> = {};
  protected readonly _maxObjSize: number;
  protected readonly log: AppiumLogger;

  constructor (opts: AppiumIpcOpts = {}) {
    this._maxObjSize = opts.maxObjSize ?? DEF_MAX_OBJ_SIZE_BYTES;
    this.log = opts.log ?? log;
    this.log.debug(`Initialized new IPC object with max object size of ${this._maxObjSize} bytes`);
  }

  subscribe<T>(topic: string, subscriberId: string): IpcSubscription<T> {
    this.log.info(`Subscribing ${subscriberId} to topic '${topic}'`);
    if (this.subscriptionExists(topic, subscriberId)) {
      throw new Error(`Subscription already exists for topic "${topic}" and subscriber "${subscriberId}"`);
    }

    this._subscriptions[topic] ??= [];
    const sub = new IpcSubscription<T>(subscriberId, topic, this);
    this._subscriptions[topic].push(sub);
    return sub;
  }

  unsubscribe(topic: string, subscriberId: string): boolean {
    this.log.info(`Unsubscribing ${subscriberId} from topic '${topic}'`);
    if (this.subscriptionExists(topic, subscriberId)) {
      this._subscriptions[topic] = this._subscriptions[topic].filter((sub) => sub.subscriberId !== subscriberId);
      return true;
    }
    return false;
  }

  async publish<T>(topic: string, publisherId: string, data: T): Promise<void> {
    this.log.debug(`${publisherId} is publishing a message to topic ${topic}`);

    const messageSize = node.getObjectSize(data);
    if (messageSize > this._maxObjSize) {
      throw new Error(`Message with size ${messageSize} bytes is bigger than max size of ${this._maxObjSize} bytes`);
    }

    let clonedData: T;
    try {
      clonedData = structuredClone(data);
    } catch (e) {
      this.log.error(`Could not clone data for IPC publish from ${publisherId} on topic ${topic}`, e);
      throw e;
    }

    const message: IpcMessage<T> = {publisher: this.getIpcPublisher(publisherId), data: clonedData, topic, timestampMs: Date.now()};

    this._messages[topic] = message;

    const subs = this._subscriptions[topic] ?
      this._subscriptions[topic].filter((sub) => sub.subscriberId !== publisherId) :
      []

    for (const sub of subs) {
      sub.emit(EVT_MESSAGE, structuredClone(message));
    }

    // we don't want to return from publish until the async iterators on subscriptions have had
    // a chance to observe the emitted value, otherwise some might get lost
    await delay(0);

  }

  getMessage<T>(topic: string): IpcMessage<T> | undefined {
    if (!this._messages[topic]) {
      return;
    }

    return structuredClone(this._messages[topic] as IpcMessage<T>);
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

