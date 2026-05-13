import {log} from './logger';
import type {StringRecord, IIpcSubscription, IAppiumIpc, IpcMessage, IpcEvent, AppiumLogger, IpcData} from '@appium/types';
import EventEmitter from 'node:events';
import {sleep} from 'asyncbox';
import {node} from '@appium/support';

const DEF_MAX_OBJ_SIZE_BYTES = 1024 * 1024; // 1mb seems like plenty for any plugin to pass a message

export const EVT_MESSAGE = 'message';
export const EVT_UNSUBSCRIBED = 'unsubscribed';

export type AppiumIpcOpts = {
  maxObjSize?: number;
  log?: AppiumLogger;
};

class StopIterationError extends Error {};

export class IpcSubscription<T extends IpcData> extends EventEmitter<IpcEvent<T>> implements IIpcSubscription<T> {

  constructor(
    public readonly subscriber: string,
    public readonly topic: string,
    private readonly ipc: AppiumIpc
  ) {
    super();
  }

  get isActive() {
    return this.ipc.subscriptionExists(this.topic, this.subscriber);
  }

  getMessage(): IpcMessage<T> | undefined {
    if (!this.isActive) {
      throw new Error('Cannot get message from subscription after unsubscribing');
    }
    return this.ipc.getMessage<T>(this.topic);
  }

  async publish(data: T): Promise<void> {
    if (!this.isActive) {
      throw new Error('Cannot publish data to topic from subscription after unsubscribing');
    }
    return await this.ipc.publish<T>(this.topic, this.subscriber, data);
  }

  unsubscribe(): boolean {
    const unsubscribeRes = this.ipc.unsubscribe(this.topic, this.subscriber);
    this.emit('unsubscribed');
    // remove listeners waiting for messages when we unsubscribe
    for (const listener of this.listeners(EVT_MESSAGE)) {
      this.removeListener(EVT_MESSAGE, listener);
    }
    return unsubscribeRes;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<IpcMessage<T>> {
    // yield any messages that are emitted, but keep an eye out for an unsubscribed that happens
    // while a caller is waiting on the loop, because we want to exit the loop in case of
    // unsubscription, even if we were already waiting on the next message.
    while (this.isActive) {
      let waitForMessageRejected = () => {};
      let waitForUnsubscribedRejected = () => {};
      const waitForMessage = new Promise((resolve, reject) => {
        waitForMessageRejected = reject;
        this.once(EVT_MESSAGE, (message: IpcMessage<T>) => {
          resolve(message);
          // ensure that our unsubscribe listener is cleaned up since we don't care anymore
          for (const listener of this.listeners(EVT_UNSUBSCRIBED)) {
            this.removeListener(EVT_UNSUBSCRIBED, listener);
          }
          // ensure the unsubscribed promise completes;
          waitForUnsubscribedRejected();
        });
      });
      const waitForUnsubscribed = new Promise((resolve, reject) => {
        waitForUnsubscribedRejected = reject;
        this.once(EVT_UNSUBSCRIBED, () => {
          reject(new StopIterationError());
          // we don't need to clean up our message listener because it's already cleaned up in the
          // unsubscribe method
          waitForMessageRejected(); // ensure the wait for message promise completes
        });
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

  subscribe<T extends IpcData>(topic: string, subscriber: string): IpcSubscription<T> {
    this.log.info(`Subscribing ${subscriber} to topic '${topic}'`);
    if (this.subscriptionExists(topic, subscriber)) {
      throw new Error(`Subscription already exists for topic "${topic}" and subscriber "${subscriber}"`);
    }

    this._subscriptions[topic] ??= [];
    const sub = new IpcSubscription<T>(subscriber, topic, this);
    this._subscriptions[topic].push(sub);
    return sub;
  }

  unsubscribe(topic: string, subscriber: string): boolean {
    this.log.info(`Unsubscribing ${subscriber} from topic '${topic}'`);
    if (this.subscriptionExists(topic, subscriber)) {
      this._subscriptions[topic] = this._subscriptions[topic].filter((sub) => sub.subscriber !== subscriber);
      return true;
    }
    return false;
  }

  async publish<T extends IpcData>(topic: string, publisher: string, data: T): Promise<void> {
    this.log.debug(`${publisher} is publishing a message to topic ${topic}`);

    const messageSize = node.getObjectSize(data);
    if (messageSize > this._maxObjSize) {
      throw new Error(`Error when ${publisher} is publishing to topic '${topic}': ` +
                      `Message with size ${messageSize} bytes is bigger than max size of ${this._maxObjSize} bytes`);
    }

    let clonedData: T;
    try {
      clonedData = structuredClone(data);
    } catch (e) {
      this.log.error(`Could not clone data for IPC publish from ${publisher} on topic ${topic}`);
      throw e;
    }

    const message: IpcMessage<T> = {publisher, data: clonedData, topic, timestampMs: Date.now()};

    this._messages[topic] = message;

    const subs = this._subscriptions[topic] ?
      this._subscriptions[topic].filter((sub) => sub.subscriber !== publisher) :
      [];

    for (const sub of subs) {
      sub.emit(EVT_MESSAGE, structuredClone(message));
    }

    // we don't want to return from publish until the async iterators on subscriptions have had
    // a chance to observe the emitted value, otherwise some might get lost
    await sleep(0);

  }

  getMessage<T extends IpcData>(topic: string): IpcMessage<T> | undefined {
    if (!this._messages[topic]) {
      return;
    }

    return structuredClone(this._messages[topic] as IpcMessage<T>);
  }

  subscriptionExists(topic: string, subscriber: string): boolean {
    return !!this._subscriptions[topic]?.some((sub) => sub.subscriber === subscriber);
  }
}
