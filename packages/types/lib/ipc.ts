import type {EventEmitter} from 'node:events';

/**
 * A representation of the (only) event allowed on the IpcSubscription EventEmitter object
 *
 * @typeparam T - the data shape for the message for a given IPC topic
 */
export interface IpcEvent<T> {
  message: [IpcMessage<T>];
}

/**
 * An IPC subscription consists of a subscriber name (mostly for logging) and a callback.
 *
 * @typeparam T - the data shape for the message intended to be received in the callback
 */
export interface IIpcSubscription<T> extends EventEmitter<IpcEvent<T>> {
  subscriberId: string;
  topic: string;
  unsubscribe(): Promise<boolean>;
  publish(data: T): Promise<void>;
  getMessage(): Promise<IpcMessage<T> | undefined>;
  [Symbol.asyncIterator](): AsyncGenerator<IpcMessage<T>>;
};

/**
 * An IPC message, consisting of a publisher name and the message object itself.
 *
 * @typeparam T - the type of the expected message
 */
export type IpcMessage<T> = {
  publisher: IpcPublisher,
  timestampMs: number,
  topic: string,
  data: T,
};

/**
 * A representation of a publisher. The name is a friendly name (usually the class name of the
 * driver or plugin). The ID is the unique name used internally by Appium, which may include object
 * reference IDs.
 */
export type IpcPublisher = {
  name: string,
  id: string,
};

/**
 * An interface implemented by the internal IPC object hosted on the Appium server.
 */
export interface IAppiumIpc {
  subscribe<T>(topic: string, subscriberId: string): Promise<IIpcSubscription<T>>;
  unsubscribe(topic: string, subscriberId: string): Promise<boolean>;
  publish<T>(topic: string, publisherId: string, data: T): Promise<void>;
  getMessage<T>(topic: string): Promise<IpcMessage<T> | undefined>;
}
