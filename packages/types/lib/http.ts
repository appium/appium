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

export type HTTPBody<T = any> = T;
