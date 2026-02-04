import type {AxiosResponse, RawAxiosRequestConfig} from 'axios';
import type {Capabilities, Constraints, SingularSessionData, W3CCapabilities} from '@appium/types';
import type {RequireAtLeastOne} from 'type-fest';

export interface NewSessionData<C extends Constraints = Constraints> {
  capabilities: RequireAtLeastOne<W3CCapabilities<C>, 'firstMatch' | 'alwaysMatch'>;
}

export interface NewSessionResponse<C extends Constraints = Constraints> {
  sessionId: string;
  capabilities: Capabilities<C>;
}

export interface SessionHelpers<CommandData = unknown, ResponseData = any> {
  newSessionURL: string;
  createAppiumTestURL: (session: string, pathname: string) => string;
  postCommand: (
    sessionId: string,
    cmdName: string,
    data?: CommandData,
    config?: RawAxiosRequestConfig
  ) => Promise<ResponseData>;
  getCommand: (
    sessionIdOrCmdName: string,
    cmdNameOrConfig: string | RawAxiosRequestConfig,
    config?: RawAxiosRequestConfig
  ) => Promise<ResponseData>;
  startSession: (
    data: NewSessionData,
    config?: RawAxiosRequestConfig
  ) => Promise<NewSessionResponse>;
  endSession: (
    sessionId: string
  ) => Promise<AxiosResponse<{value: {error?: string} | null}, {validateStatus: null}>>;
  getSession: (sessionId: string) => Promise<SingularSessionData>;
}
