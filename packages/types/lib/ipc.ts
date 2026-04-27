export type IpcSubscribeCallback<T> = (publisherName: string, message: T) => void;

export type IpcSubscription<T> = {
  subscriberName: string;
  cb: IpcSubscribeCallback<T>;
};

export type IpcMessage<T> = {
  publisherName: string,
  message: T,
};

export interface IAppiumIpc {
  subscribe<T>(topic: string, subscriberName: string, cb: IpcSubscribeCallback<T>): Promise<void>;
  unsubscribe(topic: string, subscriberName: string): Promise<void>;
  publish<T>(topic: string, publisherName: string, message: T): Promise<void>;
  getMessages<T>(topic: string): Promise<Array<IpcMessage<T>>>;
}
