import type {EventEmitter} from 'node:events';

/**
 * This is the type of data that can be validly cloned and sent over the Ipc channel
 */
export type IpcData =
  | null
  | undefined
  | string
  | number
  | boolean
  | bigint
  | Date
  | RegExp
  | Error
  | ArrayBuffer
  | SharedArrayBuffer
  | ArrayBufferView
  | ReadonlyArray<IpcData>
  | ReadonlyMap<IpcData, IpcData>
  | ReadonlySet<IpcData>
  | {[key: string]: IpcData};

/**
 * A representation of the (only) event allowed on the IpcSubscription EventEmitter object
 *
 * @typeparam T - the data shape for the message for a given IPC topic
 */
export interface IpcEvent<T extends IpcData> {
  readonly message: [IpcMessage<T>];
  readonly unsubscribed: [];
}

/**
 * An IPC subscription consists of a subscriber name (mostly for logging) and a callback.
 *
 * @typeparam T - the data shape for the message intended to be received in the callback
 */
export interface IIpcSubscription<T extends IpcData> extends EventEmitter<IpcEvent<T>> {
  readonly subscriber: string;
  readonly topic: string;
  readonly isActive: boolean;
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
export type IpcMessage<T extends IpcData> = {
  readonly publisher: string,
  readonly timestampMs: number,
  readonly topic: string,
  readonly data: T,
};

/**
 * An interface implemented by the internal IPC object hosted on the Appium server.
 */
export interface IAppiumIpc {
  subscribe<T extends IpcData>(topic: string, subscriber: string): IIpcSubscription<T>;
  unsubscribe(topic: string, subscriber: string): boolean;
  publish<T extends IpcData>(topic: string, publisher: string, data: T): Promise<void>;
  getMessage<T extends IpcData>(topic: string): IpcMessage<T> | undefined;
}
