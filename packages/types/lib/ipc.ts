import type {EventEmitter} from 'node:events';

/**
 * A representation of the (only) event allowed on the IpcSubscription EventEmitter object
 *
 * @typeparam T - the data shape for the message for a given IPC topic
 */
export interface IpcEvent<T> {
  message: IpcMessage<T>[];
}

/**
 * An IPC subscription consists of a subscriber name (mostly for logging) and a callback.
 *
 * @typeparam T - the data shape for the message intended to be received in the callback
 */
export interface IIpcSubscription<T> extends EventEmitter<IpcEvent<T>> {
  subscriberName: string;
  topic: string;
  unsubscribe(): Promise<void>;
  publish(message: T): Promise<void>;
  getMessage(): Promise<IpcMessage<T> | undefined>;
  [Symbol.asyncIterator](): AsyncGenerator<IpcMessage<T>>;
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
  subscribe<T>(topic: string, subscriberName: string): Promise<IIpcSubscription<T>>;
  unsubscribe(topic: string, subscriberName: string): Promise<void>;
  publish<T>(topic: string, publisherName: string, message: T): Promise<void>;
  getMessage<T>(topic: string): Promise<IpcMessage<T> | undefined>;
}
