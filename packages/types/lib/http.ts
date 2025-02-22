import type { AppiumLogger } from './logger';

/**
 * An object of HTTP headers.
 */
export type HTTPHeaders = Record<string, string | string[] | number | boolean | null>;

/**
 * Possible HTTP methods, as stolen from `axios`.
 *
 * @see https://npm.im/axios
 */
export type HTTPMethod =
  | 'get'
  | 'GET'
  | 'delete'
  | 'DELETE'
  | 'head'
  | 'HEAD'
  | 'options'
  | 'OPTIONS'
  | 'post'
  | 'POST'
  | 'put'
  | 'PUT'
  | 'patch'
  | 'PATCH'
  | 'purge'
  | 'PURGE'
  | 'link'
  | 'LINK'
  | 'unlink'
  | 'UNLINK';

export interface ProxyResponse<T = any> {
  statusCode: number;
  headers: HTTPHeaders;
  body: HTTPBody<T>;
}

export interface ProxyOptions {
  /**
   * Downstream URL scheme
   *
   * @default 'http'
   */
  scheme?: string;
  /**
   * Downstream server hostname
   *
   * @default 'localhost'
   */
  server?: string;
  /**
   * Downstream server port number
   *
   * @default 4444
   */
  port?: number;
  /**
   * Downstream server pathname prefix
   *
   * @default ''
   */
  base?: string;
  /**
   * Upstream server pathname prefix
   *
   * @default ''
   */
  reqBasePath?: string;
  /**
   * Initial downstream session identifier value
   *
   * @default null
   */
  sessionId?: string | null;
  /**
   * Downstream server timeout in milliseconds
   *
   * @default 240000
   */
  timeout?: number;
  /**
   * Proxy logger instance. If unset then a default logger is used
   */
  log?: AppiumLogger;
  /**
   * Whether to apply HTTP Keep-Alive to the downstream server
   *
   * @default true
   */
  keepAlive?: boolean;
}

export type HTTPBody<T = any> = T;
