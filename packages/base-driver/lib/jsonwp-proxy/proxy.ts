import type {
  AppiumLogger,
  HTTPBody,
  HTTPHeaders,
  HTTPMethod,
  ProxyOptions,
  ProxyResponse,
} from '@appium/types';
import _ from 'lodash';
import {logger, util} from '@appium/support';
import {getSummaryByCode} from '../jsonwp-status/status';
import {
  errors,
  isErrorType,
  errorFromMJSONWPStatusCode,
  errorFromW3CJsonCode,
  getResponseForW3CError,
} from '../protocol/errors';
import {isSessionCommand, routeToCommandName} from '../protocol';
import {MAX_LOG_BODY_LENGTH, DEFAULT_BASE_PATH, PROTOCOLS} from '../constants';
import {ProtocolConverter} from './protocol-converter';
import {formatResponseValue, ensureW3cResponse} from '../protocol/helpers';
import http from 'node:http';
import https from 'node:https';
import {match as pathToRegexMatch} from 'path-to-regexp';
import nodeUrl from 'node:url';
import {ProxyRequest} from './proxy-request';
import type {Request, Response} from 'express';
import type {AxiosError, AxiosResponse, RawAxiosRequestConfig} from 'axios';

const DEFAULT_LOG = logger.getLogger('WD Proxy');
const DEFAULT_REQUEST_TIMEOUT = 240000;
const COMMAND_WITH_SESSION_ID_MATCHER = pathToRegexMatch(
  '{/*prefix}/session/:sessionId{/*command}'
);

const {MJSONWP, W3C} = PROTOCOLS;

type Protocol = (typeof PROTOCOLS)[keyof typeof PROTOCOLS];

const ALLOWED_OPTS = [
  'scheme',
  'server',
  'port',
  'base',
  'reqBasePath',
  'sessionId',
  'timeout',
  'log',
  'keepAlive',
  'headers',
] as const;

export class JWProxy {
  readonly scheme: string;
  readonly server: string;
  readonly port: number;
  readonly base: string;
  readonly reqBasePath: string;
  sessionId: string | null;
  readonly timeout: number;
  readonly headers: HTTPHeaders | undefined;
  readonly httpAgent: http.Agent;
  readonly httpsAgent: https.Agent;
  readonly protocolConverter: ProtocolConverter;

  private _downstreamProtocol: Protocol | null | undefined;
  private _activeRequests: ProxyRequest[];
  private readonly _log: AppiumLogger | undefined;

  constructor(opts: ProxyOptions = {}) {
    const filteredOpts = _.pick(opts, ALLOWED_OPTS);
    const options = _.defaults(_.omit(filteredOpts, 'log'), {
      scheme: 'http',
      server: 'localhost',
      port: 4444,
      base: DEFAULT_BASE_PATH,
      reqBasePath: DEFAULT_BASE_PATH,
      sessionId: null,
      timeout: DEFAULT_REQUEST_TIMEOUT,
    }) as ProxyOptions & {
      scheme: string;
      server: string;
      port: number;
      base: string;
      reqBasePath: string;
      sessionId: string | null;
      timeout: number;
    };
    options.scheme = options.scheme.toLowerCase();
    Object.assign(this, options);

    this._activeRequests = [];
    this._downstreamProtocol = null;
    const agentOpts = {
      keepAlive: opts.keepAlive ?? true,
      maxSockets: 10,
      maxFreeSockets: 5,
    };
    this.httpAgent = new http.Agent(agentOpts);
    this.httpsAgent = new https.Agent(agentOpts);
    this.protocolConverter = new ProtocolConverter(this.proxy.bind(this), opts.log);
    this._log = opts.log;

    this.log.debug(`${this.constructor.name} options: ${JSON.stringify(options)}`);
  }

  get log(): AppiumLogger {
    return this._log ?? DEFAULT_LOG;
  }

  /**
   * Returns the number of active downstream HTTP requests.
   */
  getActiveRequestsCount(): number {
    return this._activeRequests.length;
  }

  /**
   * Cancels all currently active downstream HTTP requests.
   */
  cancelActiveRequests(): void {
    for (const ar of this._activeRequests) {
      ar.cancel();
    }
    this._activeRequests = [];
  }

  /**
   * Sets the protocol used by the downstream server (W3C or MJSONWP).
   */
  set downstreamProtocol(value: Protocol | null | undefined) {
    this._downstreamProtocol = value;
    this.protocolConverter.downstreamProtocol = value;
  }

  /**
   * Gets the protocol used by the downstream server (W3C or MJSONWP).
   */
  get downstreamProtocol(): Protocol | null | undefined {
    return this._downstreamProtocol;
  }

  /**
   * Builds a full downstream URL (including base path and session) for a given upstream URL.
   */
  getUrlForProxy(url: string, method?: HTTPMethod): string {
    const parsedUrl = this._parseUrl(url);
    const normalizedPathname = this._toNormalizedPathname(parsedUrl);
    const commandName = normalizedPathname
      ? routeToCommandName(normalizedPathname, method)
      : '';
    const requiresSessionId =
      !commandName || (commandName && isSessionCommand(commandName));
    const proxyPrefix = `${this.scheme}://${this.server}:${this.port}${this.base}`;
    let proxySuffix = normalizedPathname ? `/${_.trimStart(normalizedPathname, '/')}` : '';
    if (parsedUrl.search) {
      proxySuffix += parsedUrl.search;
    }
    if (!requiresSessionId) {
      return `${proxyPrefix}${proxySuffix}`;
    }
    if (!this.sessionId) {
      throw new ReferenceError(
        `Session ID is not set, but saw a URL that requires it (${url})`
      );
    }
    return `${proxyPrefix}/session/${this.sessionId}${proxySuffix}`;
  }

  /**
   * Proxies a raw WebDriver command to the downstream server.
   */
  async proxy(
    url: string,
    method: string,
    body: HTTPBody = null
  ): Promise<[ProxyResponse, HTTPBody]> {
    method = method.toUpperCase();
    const newUrl = this.getUrlForProxy(url, method as HTTPMethod);
    const truncateBody = (content: unknown): string =>
      _.truncate(_.isString(content) ? content : JSON.stringify(content), {
        length: MAX_LOG_BODY_LENGTH,
      });
    const reqOpts: RawAxiosRequestConfig = {
      url: newUrl,
      method,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'user-agent': 'appium',
        accept: 'application/json, */*',
        ...(this.headers ?? {}),
      },
      proxy: false,
      timeout: this.timeout,
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent,
    };
    // GET methods shouldn't have any body. Most servers are OK with this,
    // but WebDriverAgent throws 400 errors
    if (util.hasValue(body) && method !== 'GET') {
      if (typeof body !== 'object') {
        try {
          reqOpts.data = JSON.parse(body as string);
        } catch (error) {
          this.log.warn(
            'Invalid body payload (%s): %s',
            (error as Error).message,
            logger.markSensitive(truncateBody(body))
          );
          throw new Error(
            'Cannot interpret the request body as valid JSON. Check the server log for more details.'
          );
        }
      } else {
        reqOpts.data = body;
      }
    }

    this.log.debug(
      `Proxying [%s %s] to [%s %s] with ${reqOpts.data ? 'body: %s' : '%s body'}`,
      method,
      url || '/',
      method,
      newUrl,
      reqOpts.data ? logger.markSensitive(truncateBody(reqOpts.data)) : 'no'
    );

    const throwProxyError = (error: unknown): never => {
      const err = new Error(`The request to ${url} has failed`) as Error & {
        response: {data: unknown; status: number};
      };
      err.response = {
        data: error,
        status: 500,
      };
      throw err;
    };
    let isResponseLogged = false;
    try {
      const {data, status, headers} = await this.request(reqOpts);
      // `data` might be really big
      // Be careful while handling it to avoid memory leaks
      if (!_.isPlainObject(data)) {
        // The response should be a valid JSON object
        // If it cannot be coerced to an object then the response is wrong
        throwProxyError(data);
      }
      this.log.debug(`Got response with status ${status}: ${truncateBody(data)}`);
      isResponseLogged = true;
      const isSessionCreationRequest = url.endsWith('/session') && method === 'POST';
      if (isSessionCreationRequest) {
        if (status === 200) {
          const value = (data as Record<string, unknown>).value as
            | Record<string, unknown>
            | undefined;
          const raw =
            (data as Record<string, unknown>).sessionId ?? value?.sessionId;
          this.sessionId =
            typeof raw === 'string' ? raw : raw != null ? String(raw) : null;
        }
        this.downstreamProtocol = this.getProtocolFromResBody(
          data as Record<string, unknown>
        ) ?? this.downstreamProtocol;
        this.log.info(`Determined the downstream protocol as '${this.downstreamProtocol}'`);
      }
      if (
        _.has(data, 'status') &&
        parseInt((data as Record<string, unknown>).status as string, 10) !== 0
      ) {
        throwProxyError(data);
      }
      return [
        {
          statusCode: status,
          headers: headers as HTTPHeaders,
          body: data,
        },
        data,
      ];
    } catch (e: unknown) {
      const err = e as AxiosError<unknown> & {message: string};
      let proxyErrorMsg = err.message;
      if (util.hasValue(err.response)) {
        if (!isResponseLogged) {
          const error = truncateBody(err.response.data);
          this.log.info(
            util.hasValue(err.response.status)
              ? `Got response with status ${err.response.status}: ${error}`
              : `Got response with unknown status: ${error}`
          );
        }
      } else {
        proxyErrorMsg = `Could not proxy command to the remote server. Original error: ${err.message}`;
        this.log.info(err.message);
      }
      throw new errors.ProxyRequestError(
        proxyErrorMsg,
        err.response?.data,
        err.response?.status
      );
    }
  }

  /**
   * Detects the downstream protocol from a response body.
   */
  getProtocolFromResBody(resObj: Record<string, unknown>): Protocol | undefined {
    if (_.isInteger(resObj.status)) {
      return MJSONWP;
    }
    if (!_.isUndefined(resObj.value)) {
      return W3C;
    }
  }

  /**
   * Proxies a command identified by its HTTP method and URL to the downstream server.
   */
  async proxyCommand(
    url: string,
    method: HTTPMethod,
    body: HTTPBody = null
  ): Promise<[ProxyResponse, HTTPBody]> {
    const parsedUrl = this._parseUrl(url);
    const normalizedPathname = this._toNormalizedPathname(parsedUrl);
    const commandName = normalizedPathname
      ? routeToCommandName(normalizedPathname, method)
      : '';
    if (!commandName) {
      return await this.proxy(url, method, body);
    }
    this.log.debug(`Matched '${url}' to command name '${commandName}'`);

    return await this.protocolConverter.convertAndProxy(commandName, url, method, body);
  }

  /**
   * Executes a WebDriver command and returns the unwrapped `value` field (or throws).
   */
  async command(
    url: string,
    method: HTTPMethod,
    body: HTTPBody = null
  ): Promise<HTTPBody> {
    let response: ProxyResponse;
    let resBodyObj: HTTPBody;
    try {
      [response, resBodyObj] = await this.proxyCommand(url, method, body);
    } catch (err: unknown) {
      if (isErrorType(err, errors.ProxyRequestError)) {
        throw err.getActualError();
      }
      throw new errors.UnknownError((err as Error).message);
    }
    const resBody = resBodyObj as Record<string, unknown>;
    const protocol = this.getProtocolFromResBody(resBody);
    if (protocol === MJSONWP) {
      if (response.statusCode === 200 && resBody.status === 0) {
        return resBody.value;
      }
      const status = parseInt(resBody.status as string, 10);
      if (!isNaN(status) && status !== 0) {
        let message: unknown = resBody.value;
        if (_.isPlainObject(message) && _.has(message, 'message')) {
          message = (message as Record<string, unknown>).message;
        }
        throw errorFromMJSONWPStatusCode(status, _.isEmpty(message)
          ? getSummaryByCode(status)
          : (message as string | {message: string}));
      }
    } else if (protocol === W3C) {
      if (response.statusCode < 300) {
        return resBody.value;
      }
      if (_.isPlainObject(resBody.value) && (resBody.value as Record<string, unknown>).error) {
        const value = resBody.value as Record<string, unknown>;
        throw errorFromW3CJsonCode(
          value.error as string,
          (value.message as string) ?? '',
          value.stacktrace as string | undefined
        );
      }
    } else if (response.statusCode === 200) {
      return resBodyObj;
    }
    throw new errors.UnknownError(
      `Did not know what to do with response code '${response.statusCode}' ` +
        `and response body '${_.truncate(JSON.stringify(resBodyObj), {
          length: 300,
        })}'`
    );
  }

  /**
   * Extracts a session id from a WebDriver-style URL.
   */
  getSessionIdFromUrl(url: string): string | null {
    const match = url.match(/\/session\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Proxies an Express `Request`/`Response` pair to the downstream server,
   * converting any downstream errors into a proper W3C HTTP response.
   *
   * This method must not throw; it always writes a response.
   */
  async proxyReqRes(req: Request, res: Response): Promise<void> {
    let statusCode: number;
    let resBodyObj: HTTPBody;
    try {
      const [response, body] = await this.proxyCommand(
        req.originalUrl,
        req.method as HTTPMethod,
        req.body
      );
      statusCode = response.statusCode;
      resBodyObj = body;
    } catch (err: unknown) {
      [statusCode, resBodyObj] = getResponseForW3CError(
        isErrorType(err, errors.ProxyRequestError) ? (err as InstanceType<typeof errors.ProxyRequestError>).getActualError() : err
      );
    }
    res.setHeader('content-type', 'application/json; charset=utf-8');
    if (!_.isPlainObject(resBodyObj)) {
      const error = new errors.UnknownError(
        `The downstream server response with the status code ${statusCode} is not a valid JSON object: ` +
          _.truncate(`${resBodyObj}`, {length: 300})
      );
      [statusCode, resBodyObj] = getResponseForW3CError(error);
    }

    const resBody = resBodyObj as Record<string, unknown>;
    if (_.has(resBody, 'sessionId')) {
      const reqSessionId = this.getSessionIdFromUrl(req.originalUrl);
      if (reqSessionId) {
        this.log.info(`Replacing sessionId ${resBody.sessionId} with ${reqSessionId}`);
        resBody.sessionId = reqSessionId;
      } else if (this.sessionId) {
        this.log.info(`Replacing sessionId ${resBody.sessionId} with ${this.sessionId}`);
        resBody.sessionId = this.sessionId;
      }
    }
    resBody.value = formatResponseValue(resBody.value as object | undefined);
    res.status(statusCode).json(ensureW3cResponse(resBody));
  }

  /**
   * Performs requests to the downstream server
   *
   * @private - Do not call this method directly,
   * it uses client-specific arguments and responses!
   */
  private async request(requestConfig: RawAxiosRequestConfig): Promise<AxiosResponse> {
    const req = new ProxyRequest(requestConfig);
    this._activeRequests.push(req);
    try {
      return await req.execute();
    } finally {
      _.pull(this._activeRequests, req);
    }
  }

  private _parseUrl(url: string): nodeUrl.UrlWithStringQuery {
    // eslint-disable-next-line n/no-deprecated-api -- we need relative URL support
    const parsedUrl = nodeUrl.parse(url || '/');
    if (
      _.isNil(parsedUrl.href) ||
      _.isNil(parsedUrl.pathname) ||
      (parsedUrl.protocol && !['http:', 'https:'].includes(parsedUrl.protocol))
    ) {
      throw new Error(`Did not know how to proxy the url '${url}'`);
    }
    return parsedUrl;
  }

  private _toNormalizedPathname(parsedUrl: nodeUrl.UrlWithStringQuery): string {
    if (!_.isString(parsedUrl.pathname)) {
      return '';
    }
    let pathname =
      this.reqBasePath && parsedUrl.pathname.startsWith(this.reqBasePath)
        ? parsedUrl.pathname.replace(this.reqBasePath, '')
        : parsedUrl.pathname;
    const match = COMMAND_WITH_SESSION_ID_MATCHER(pathname);
    // This is needed for the backward compatibility
    // if drivers don't set reqBasePath properly
    if (!this.reqBasePath) {
      if (match && match.params && _.isArray((match.params as Record<string, unknown>).prefix)) {
        pathname = pathname.replace(
          `/${((match.params as Record<string, unknown>).prefix as string[]).join('/')}`,
          ''
        );
      } else if (_.startsWith(pathname, '/wd/hub')) {
        pathname = pathname.replace('/wd/hub', '');
      }
    }
    let result = pathname;
    if (match && match.params) {
      const command = (match.params as Record<string, unknown>).command;
      result = _.isArray(command) ? `/${(command as string[]).join('/')}` : '';
    }
    return _.trimEnd(result, '/');
  }
}
