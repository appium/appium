import {log} from './logger';
import type {StringRecord, IpcSubscribeCallback, IAppiumIpc, IpcSubscription, IpcMessage} from "@appium/types";

export class AppiumIpc implements IAppiumIpc {
  protected _messages: StringRecord<Array<IpcMessage>>;
  protected _subscriptions: StringRecord<Array<IpcSubscription>>;

  constructor() {
    this._messages = {};
    this._subscriptions = {};
  }

  subscriptionExists(topic: string, subscriberName: string) {
    if (!this._subscriptions[topic]) {
      return false;
    }

    for (const sub of this._subscriptions[topic]) {
      if (sub.subscriberName === subscriberName) {
        return true;
      }
    }
    return false;
  }

  subscribe(topic: string, subscriberName: string, cb: IpcSubscribeCallback) { // eslint-disable-line promise/prefer-await-to-callbacks
    log.info(`Subscribing ${subscriberName} to topic '${topic}'`);
    if (this.subscriptionExists(topic, subscriberName)) {
      throw new Error(`Subscription already exists for topic "${topic}" and subscriber "${subscriberName}"`);
    }

    if (!this._subscriptions[topic]) {
      this._subscriptions[topic] = [];
    }
    this._subscriptions[topic].push({subscriberName, cb});
  }

  unsubscribe(topic: string, subscriberName: string) {
    log.info(`Unsubscribing ${subscriberName} from topic '${topic}'`);
    if (this.subscriptionExists(topic, subscriberName)) {
      this._subscriptions[topic] = this._subscriptions[topic].filter((sub) => sub.subscriberName !== subscriberName);
    }
  }

  publish(topic: string, publisherName: string, message: any) {
    log.info(`${publisherName} is publishing a message to topic ${topic}`);
    if (!this._messages[topic]) {
      this._messages[topic] = [];
    }

    // TODO message array should be a queue that removes items when size grows too large
    this._messages[topic].push({publisherName, message});

    if (this._subscriptions[topic]) {
      for (const sub of this._subscriptions[topic]) {
        // don't publish a message to a subscriber that is also the publisher of the message
        if (sub.subscriberName !== publisherName) {
          sub.cb(publisherName, message);
        }
      }
    }
  }

  getMessages(topic: string) {
    if (!this._messages[topic]) {
      return [];
    }

    return structuredClone(this._messages[topic]);
  }
}
