/**
 * The async callback function called when a message is published on a certain IPC topic
 *
 * @typeparam T - the data shape for the message intended to be received in the callback
 */
export type IpcSubscribeCallback<T> = (publisherName: string, message: T) => Promise<void>;

/**
 * An IPC subscription consists of a subscriber name (mostly for logging) and a callback.
 *
 * @typeparam T - the data shape for the message intended to be received in the callback
 */
export type IpcSubscription<T> = {
  subscriberName: string;
  cb: IpcSubscribeCallback<T>;
};

/**
 * An IPC message, consisting of a publisher name and the message object itself.
 *
 * @typeparam T - the type of the expected message
 */
export type IpcMessage<T> = {
  publisherName: string,
  message: T,
};

/**
 * An interface implemented by the internal IPC object hosted on the Appium server.
 */
export interface IAppiumIpc {
  subscribe<T>(topic: string, subscriberName: string, cb: IpcSubscribeCallback<T>): Promise<void>;
  unsubscribe(topic: string, subscriberName: string): Promise<void>;
  publish<T>(topic: string, publisherName: string, message: T): Promise<void>;
  getMessages<T>(topic: string): Promise<Array<IpcMessage<T>>>;
}
