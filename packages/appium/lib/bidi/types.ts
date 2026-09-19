import type {ExtensionCore} from '@appium/base-driver';
import type {BidiEventOrigin, BidiEventPayload, ExternalDriver, Plugin} from '@appium/types';

import type {AppiumDriver} from '../appium.js';
import type {BidiProxyClient} from './proxy-client.js';

export type ExtensionPlugin = Plugin & ExtensionCore;
export type AnyDriver = ExternalDriver | AppiumDriver;
export type SendData = (data: string | Buffer) => Promise<void>;
export type LogSocketError = (err: Error) => void;
export type BidiDispatch = (event: BidiEventPayload, origin: BidiEventOrigin) => Promise<void>;

export interface InitBiDiSocketResult {
  bidiHandlerDriver: AnyDriver;
  bidiHandlerPlugins: ExtensionPlugin[];
  bidiProxyClient: BidiProxyClient | null;
  send: SendData;
  logSocketErr: LogSocketError;
}
