import EventEmitter from 'node:events';

import {node} from '@appium/support';
import type {
  AppiumLogger,
  IAppiumIpc,
  IIpcSubscription,
  IpcData,
  IpcEvent,
  IpcMessage,
  StringRecord,
} from '@appium/types';
import {sleep} from 'asyncbox';

import {log} from '../helpers/logger.js';

const DEF_MAX_OBJ_SIZE_BYTES = 1024 * 1024; // 1mb seems like plenty for any plugin to pass a message
const DEF_MAX_TOPICS = 1000;

export const EVT_MESSAGE = 'message';
export const EVT_UNSUBSCRIBED = 'unsubscribed';

export type AppiumIpcOpts = {
  maxObjSize?: number;
  maxTopics?: number;
  log?: AppiumLogger;
};

const ASYNC_ITERATOR_STOP = Symbol('asyncIteratorStop');

export class IpcSubscription<T extends IpcData> extends EventEmitter<IpcEvent<T>> implements IIpcSubscription<T> {
  private readonly pendingIterators = new Set<() => void>();

  constructor(
    public readonly subscriber: string,
    public readonly topic: string,
    private readonly ipc: AppiumIpc,
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
    if (!this.isActive) {
      return false;
    }
    return this.ipc.unsubscribe(this.topic, this.subscriber);
  }

  /**
   * Ends iterator waits before notifying observers, whose listeners may throw.
   * @internal Called after AppiumIpc removes this subscription from its registry.
   */
  notifyUnsubscribed(): void {
    for (const stopWaiting of this.pendingIterators) {
      stopWaiting();
    }
    this.pendingIterators.clear();
    try {
      this.emit(EVT_UNSUBSCRIBED);
    } finally {
      this.removeAllListeners(EVT_MESSAGE);
    }
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<IpcMessage<T>> {
    // Keep iterator completion independent of public event listeners so a failing
    // observer cannot prevent unsubscription from ending a wait for the next message.
    while (this.isActive) {
      const val = await new Promise<IpcMessage<T> | typeof ASYNC_ITERATOR_STOP>((resolve) => {
        const onMessage = (message: IpcMessage<T>) => {
          this.pendingIterators.delete(onUnsubscribed);
          resolve(message);
        };
        const onUnsubscribed = () => {
          this.off(EVT_MESSAGE, onMessage);
          resolve(ASYNC_ITERATOR_STOP);
        };
        this.pendingIterators.add(onUnsubscribed);
        this.once(EVT_MESSAGE, onMessage);
      });
      if (val === ASYNC_ITERATOR_STOP) {
        break;
      }
      yield val;
    }
  }
}

export class AppiumIpc implements IAppiumIpc {
  protected readonly messageByTopic: StringRecord<IpcMessage<any>> = {};
  protected readonly subs: StringRecord<Array<IpcSubscription<any>>> = {};
  protected readonly topics = new Set<string>();
  protected readonly maxObjSize: number;
  protected readonly maxTopics: number;
  protected readonly log: AppiumLogger;

  constructor(opts: AppiumIpcOpts = {}) {
    this.maxObjSize = opts.maxObjSize ?? DEF_MAX_OBJ_SIZE_BYTES;
    this.maxTopics = opts.maxTopics ?? DEF_MAX_TOPICS;
    this.log = opts.log ?? log;
    this.log.debug(
      `Initialized new IPC object with max object size of ${this.maxObjSize} bytes ` +
        `and max topics of ${this.maxTopics}`,
    );
  }

  subscribe<T extends IpcData>(topic: string, subscriber: string): IpcSubscription<T> {
    this.log.info(`Subscribing ${subscriber} to topic '${topic}'`);
    if (this.subscriptionExists(topic, subscriber)) {
      throw new Error(`Subscription already exists for topic "${topic}" and subscriber "${subscriber}"`);
    }

    this.ensureTopic(topic);
    this.subs[topic] ??= [];
    const sub = new IpcSubscription<T>(subscriber, topic, this);
    this.subs[topic].push(sub);
    return sub;
  }

  unsubscribe(topic: string, subscriber: string): boolean {
    this.log.info(`Unsubscribing ${subscriber} from topic '${topic}'`);
    const subscription = this.subs[topic]?.find((sub) => sub.subscriber === subscriber);
    if (!subscription) {
      return false;
    }
    this.subs[topic] = this.subs[topic].filter((sub) => sub !== subscription);
    subscription.notifyUnsubscribed();
    return true;
  }

  async publish<T extends IpcData>(topic: string, publisher: string, data: T): Promise<void> {
    this.log.debug(`${publisher} is publishing a message to topic ${topic}`);

    this.ensureTopic(topic);

    const messageSize = node.getObjectSize(data);
    if (messageSize > this.maxObjSize) {
      throw new Error(
        `Error when ${publisher} is publishing to topic '${topic}': ` +
          `Message with size ${messageSize} bytes is bigger than max size of ${this.maxObjSize} bytes`,
      );
    }

    let clonedData: T;
    try {
      clonedData = structuredClone(data);
    } catch (e) {
      throw new Error(`Could not clone data for IPC publish from ${publisher} on topic ${topic}`, {
        cause: e,
      });
    }

    const message: IpcMessage<T> = {publisher, data: clonedData, topic, timestampMs: Date.now()};

    this.messageByTopic[topic] = message;

    const subs = this.subs[topic] ? this.subs[topic].filter((sub) => sub.subscriber !== publisher) : [];

    for (const sub of subs) {
      sub.emit(EVT_MESSAGE, structuredClone(message));
    }

    // we don't want to return from publish until the async iterators on subscriptions have had
    // a chance to observe the emitted value, otherwise some might get lost
    await sleep(0);
  }

  getMessage<T extends IpcData>(topic: string): IpcMessage<T> | undefined {
    if (!this.messageByTopic[topic]) {
      return;
    }

    return structuredClone(this.messageByTopic[topic] as IpcMessage<T>);
  }

  subscriptionExists(topic: string, subscriber: string): boolean {
    return !!this.subs[topic]?.some((sub) => sub.subscriber === subscriber);
  }

  protected ensureTopic(topic: string): void {
    if (this.topics.has(topic)) {
      return;
    }
    if (this.topics.size >= this.maxTopics) {
      throw new Error(
        `Cannot create new IPC topic '${topic}': ` +
          `maximum of ${this.maxTopics} topics per session reached. ` +
          `Adjust with the --max-ipc-topics server arg.`,
      );
    }
    this.topics.add(topic);
  }
}
