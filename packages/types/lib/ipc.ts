import type {EventEmitter} from 'node:events';

/**
 * A representation of the (only) event allowed on the IpcSubscription EventEmitter object
 *
 * @typeparam T - the data shape for the message for a given IPC topic
 */
export interface IpcEvent<T> {
  message: [IpcMessage<T>];
  unsubscribed: [];
}

/**
 * An IPC subscription consists of a subscriber name (mostly for logging) and a callback.
 *
 * @typeparam T - the data shape for the message intended to be received in the callback
 */
export interface IIpcSubscription<T> extends EventEmitter<IpcEvent<T>> {
  subscriber: string;
  topic: string;
  unsubscribe(): boolean;
  publish(data: T): Promise<void>;
  getMessage(): IpcMessage<T> | undefined;
  [Symbol.asyncIterator](): AsyncGenerator<IpcMessage<T>>;
};

/**
 * An IPC message, consisting of a publisher name and the message object itself.
 *
 * @typeparam T - the type of the expected message
 */
export type IpcMessage<T> = {
  publisher: string,
  timestampMs: number,
  topic: string,
  data: T,
};

/**
 * An interface implemented by the internal IPC object hosted on the Appium server.
 */
export interface IAppiumIpc {
  subscribe<T>(topic: string, subscriber: string): IIpcSubscription<T>;
  unsubscribe(topic: string, subscriber: string): boolean;
  publish<T>(topic: string, publisher: string, data: T): Promise<void>;
  getMessage<T>(topic: string): IpcMessage<T> | undefined;
}
