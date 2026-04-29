import type EventEmitter from 'node:events';

/**
 * An IPC subscription consists of a subscriber name (mostly for logging) and a callback.
 *
 * @typeparam T - the data shape for the message intended to be received in the callback
 */
export interface IIpcSubscription extends EventEmitter {
  subscriberName: string;
  topic: string;
  unsubscribe(): Promise<void>;
  publish<T>(message: T): Promise<void>;
  getMessage<T>(): Promise<IpcMessage<T> | undefined>;
};

/**
 * An IPC message, consisting of a publisher name and the message object itself.
 *
 * @typeparam T - the type of the expected message
 */
export type IpcMessage<T> = {
  publisherName: string,
  timestamp: number,
  topic: string,
  data: T,
};

/**
 * An interface implemented by the internal IPC object hosted on the Appium server.
 */
export interface IAppiumIpc {
  subscribe<T>(topic: string, subscriberName: string): Promise<IIpcSubscription>; // eslint-disable-line @typescript-eslint/no-unused-vars
  unsubscribe(topic: string, subscriberName: string): Promise<void>;
  publish<T>(topic: string, publisherName: string, message: T): Promise<void>;
  getMessage<T>(topic: string): Promise<IpcMessage<T> | undefined>;
}
