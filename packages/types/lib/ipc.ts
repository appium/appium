export type IpcSubscribeCallback = (publisherName: string, message: any) => void;

export type IpcSubscription = {
  subscriberName: string;
  cb: IpcSubscribeCallback;
};

export type IpcMessage = {
  publisherName: string,
  message: any,
};

export interface IAppiumIpc {
  subscriptionExists(topic: string, subscriberName: string): boolean;
  subscribe(topic: string, subscriberName: string, cb: IpcSubscribeCallback): void;
  unsubscribe(topic: string, subscriberName: string): void;
  publish(topic: string, publisherName: string, message: any): void;
  getMessages(topic: string): Array<IpcMessage>;
}
