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
import ProtocolConverter from './protocol-converter';
import {formatResponseValue, formatStatus} from '../protocol/helpers';
import http from 'http';
import https from 'https';
import { match as pathToRegexMatch } from 'path-to-regexp';
import nodeUrl from 'node:url';
import { ProxyRequest } from './proxy-request';

const DEFAULT_LOG = logger.getLogger('WD Proxy');
const DEFAULT_REQUEST_TIMEOUT = 240000;
const COMMAND_WITH_SESSION_ID_MATCHER = pathToRegexMatch('{/*prefix}/session/:sessionId{/*command}');

const {MJSONWP, W3C} = PROTOCOLS;

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
];

export class JWProxy {
  /** @type {string} */
  scheme;
  /** @type {string} */
  server;
  /** @type {number} */
  port;
  /** @type {string} */
  base;
  /** @type {string} */
  reqBasePath;
  /** @type {string?} */
  sessionId;
  /** @type {number} */
  timeout;
  /** @type {Protocol | null | undefined} */
  _downstreamProtocol;
  /** @type {ProxyRequest[]} */
  _activeRequests;

  /**
   * @param {import('@appium/types').ProxyOptions} [opts={}]
   */
  constructor(opts = {}) {
    const filteredOpts = _.pick(opts, ALLOWED_OPTS);
    // omit 'log' in the defaults assignment here because 'log' is a getter and we are going to set
    // it to this._log (which lies behind the getter) further down
    /** @type {import('@appium/types').ProxyOptions} */
    const options = _.defaults(_.omit(filteredOpts, 'log'), {
      scheme: 'http',
      server: 'localhost',
      port: 4444,
      base: DEFAULT_BASE_PATH,
      reqBasePath: DEFAULT_BASE_PATH,
      sessionId: null,
      timeout: DEFAULT_REQUEST_TIMEOUT,
    });
    options.scheme = /** @type {string} */ (options.scheme).toLowerCase();
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

  get log() {
    return this._log ?? DEFAULT_LOG;
  }

  /**
   * Performs requests to the downstream server
   *
   * @private - Do not call this method directly,
   * it uses client-specific arguments and responses!
   *
   * @param {import('axios').RawAxiosRequestConfig} requestConfig
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  async request(requestConfig) {
    const req = new ProxyRequest(requestConfig);
    this._activeRequests.push(req);
    try {
      return await req.execute();
    } finally {
      _.pull(this._activeRequests, req);
    }
  }

  /**
   * @returns {number}
   */
  getActiveRequestsCount() {
    return this._activeRequests.length;
  }

  cancelActiveRequests() {
    for (const ar of this._activeRequests) {
      ar.cancel();
    }
    this._activeRequests = [];
  }

  /**
   * @param {Protocol | null | undefined} value
   */
  set downstreamProtocol(value) {
    this._downstreamProtocol = value;
    this.protocolConverter.downstreamProtocol = value;
  }

  get downstreamProtocol() {
    return this._downstreamProtocol;
  }

  /**
   *
   * @param {string} url
   * @param {string} [method]
   * @returns {string}
   */
  getUrlForProxy(url, method) {
    const parsedUrl = this._parseUrl(url);
    const normalizedPathname = this._toNormalizedPathname(parsedUrl);
    const commandName = normalizedPathname
      ? routeToCommandName(
        normalizedPathname,
        /** @type {import('@appium/types').HTTPMethod | undefined} */ (method)
      )
      : '';
    const requiresSessionId = !commandName || (commandName && isSessionCommand(commandName));
    const proxyPrefix = `${this.scheme}://${this.server}:${this.port}${this.base}`;
    let proxySuffix = normalizedPathname ? `/${_.trimStart(normalizedPathname, '/')}` : '';
    if (parsedUrl.search) {
      proxySuffix += parsedUrl.search;
    }
    if (!requiresSessionId) {
      return `${proxyPrefix}${proxySuffix}`;
    }
    if (!this.sessionId) {
      throw new ReferenceError(`Session ID is not set, but saw a URL that requires it (${url})`);
    }
    return `${proxyPrefix}/session/${this.sessionId}${proxySuffix}`;
  }

  /**
   *
   * @param {string} url
   * @param {string} method
   * @param {import('@appium/types').HTTPBody} [body=null]
   * @returns {Promise<[import('@appium/types').ProxyResponse, import('@appium/types').HTTPBody]>}
   */
  async proxy(url, method, body = null) {
    method = method.toUpperCase();
    const newUrl = this.getUrlForProxy(url, method);
    const truncateBody = (content) =>
      _.truncate(_.isString(content) ? content : JSON.stringify(content), {
        length: MAX_LOG_BODY_LENGTH,
      });
    /** @type {import('axios').RawAxiosRequestConfig} */
    const reqOpts = {
      url: newUrl,
      method,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'user-agent': 'appium',
        accept: 'application/json, */*',
      },
      proxy: false,
      timeout: this.timeout,
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent,
    };
    // GET methods shouldn't have any body. Most servers are OK with this, but WebDriverAgent throws 400 errors
    if (util.hasValue(body) && method !== 'GET') {
      if (typeof body !== 'object') {
        try {
          reqOpts.data = JSON.parse(body);
        } catch {
          throw new Error(`Cannot interpret the request body as valid JSON: ${truncateBody(body)}`);
        }
      } else {
        reqOpts.data = body;
      }
    }

    this.log.debug(
      `Proxying [${method} ${url || '/'}] to [${method} ${newUrl}] ` +
        (reqOpts.data ? `with body: ${truncateBody(reqOpts.data)}` : 'with no body')
    );

    const throwProxyError = (error) => {
      const err = /** @type {ProxyError} */ (new Error(`The request to ${url} has failed`));
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
          this.sessionId = data.sessionId || (data.value || {}).sessionId;
        }
        this.downstreamProtocol = this.getProtocolFromResBody(data);
        this.log.info(`Determined the downstream protocol as '${this.downstreamProtocol}'`);
      }
      if (_.has(data, 'status') && parseInt(data.status, 10) !== 0) {
        // Some servers, like chromedriver may return response code 200 for non-zero JSONWP statuses
        throwProxyError(data);
      }
      const headersMap = /** @type {import('@appium/types').HTTPHeaders} */ (headers);
      return [{
        statusCode: status,
        headers: headersMap,
        body: data,
      }, data];
    } catch (e) {
      // We only consider an error unexpected if this was not
      // an async request module error or if the response cannot be cast to
      // a valid JSON
      let proxyErrorMsg = e.message;
      if (util.hasValue(e.response)) {
        if (!isResponseLogged) {
          const error = truncateBody(e.response.data);
          this.log.info(
            util.hasValue(e.response.status)
              ? `Got response with status ${e.response.status}: ${error}`
              : `Got response with unknown status: ${error}`
          );
        }
      } else {
        proxyErrorMsg = `Could not proxy command to the remote server. Original error: ${e.message}`;
        this.log.info(e.message);
      }
      throw new errors.ProxyRequestError(proxyErrorMsg, e.response?.data, e.response?.status);
    }
  }

  /**
   *
   * @param {Record<string, any>} resObj
   * @returns {Protocol | undefined}
   */
  getProtocolFromResBody(resObj) {
    if (_.isInteger(resObj.status)) {
      return MJSONWP;
    }
    if (!_.isUndefined(resObj.value)) {
      return W3C;
    }
  }

  /**
   * @deprecated This method is not used anymore and will be removed
   *
   * @param {string} url
   * @param {import('@appium/types').HTTPMethod} method
   * @returns {string|undefined}
   */
  requestToCommandName(url, method) {
    /**
     *
     * @param {RegExp} pattern
     * @returns {string|undefined}
     */
    const extractCommandName = (pattern) => {
      const pathMatch = pattern.exec(url);
      if (pathMatch) {
        return routeToCommandName(pathMatch[1], method, this.reqBasePath);
      }
    };
    let commandName = routeToCommandName(url, method, this.reqBasePath);
    if (!commandName && _.includes(url, `${this.reqBasePath}/session/`)) {
      commandName = extractCommandName(
        new RegExp(`${_.escapeRegExp(this.reqBasePath)}/session/[^/]+(.+)`)
      );
    }
    if (!commandName && _.includes(url, this.reqBasePath)) {
      commandName = extractCommandName(new RegExp(`${_.escapeRegExp(this.reqBasePath)}(/.+)`));
    }
    return commandName;
  }

  /**
   *
   * @param {string} url
   * @param {import('@appium/types').HTTPMethod} method
   * @param {import('@appium/types').HTTPBody} [body=null]
   * @returns {Promise<[import('@appium/types').ProxyResponse, import('@appium/types').HTTPBody]>}
   */
  async proxyCommand(url, method, body = null) {
    const parsedUrl = this._parseUrl(url);
    const normalizedPathname = this._toNormalizedPathname(parsedUrl);
    const commandName = normalizedPathname ? routeToCommandName(normalizedPathname, method) : '';
    if (!commandName) {
      return await this.proxy(url, method, body);
    }
    this.log.debug(`Matched '${url}' to command name '${commandName}'`);

    return await this.protocolConverter.convertAndProxy(commandName, url, method, body);
  }

  /**
   *
   * @param {string} url
   * @param {import('@appium/types').HTTPMethod} method
   * @param {import('@appium/types').HTTPBody} [body=null]
   * @returns {Promise<import('@appium/types').HTTPBody>}
   */
  async command(url, method, body = null) {
    let response;
    let resBodyObj;
    try {
      [response, resBodyObj] = await this.proxyCommand(url, method, body);
    } catch (err) {
      if (isErrorType(err, errors.ProxyRequestError)) {
        throw err.getActualError();
      }
      throw new errors.UnknownError(err.message);
    }
    const protocol = this.getProtocolFromResBody(resBodyObj);
    if (protocol === MJSONWP) {
      // Got response in MJSONWP format
      if (response.statusCode === 200 && resBodyObj.status === 0) {
        return resBodyObj.value;
      }
      const status = parseInt(resBodyObj.status, 10);
      if (!isNaN(status) && status !== 0) {
        let message = resBodyObj.value;
        if (_.has(message, 'message')) {
          message = message.message;
        }
        throw errorFromMJSONWPStatusCode(
          status,
          _.isEmpty(message) ? getSummaryByCode(status) : message
        );
      }
    } else if (protocol === W3C) {
      // Got response in W3C format
      if (response.statusCode < 300) {
        return resBodyObj.value;
      }
      if (_.isPlainObject(resBodyObj.value) && resBodyObj.value.error) {
        throw errorFromW3CJsonCode(
          resBodyObj.value.error,
          resBodyObj.value.message,
          resBodyObj.value.stacktrace
        );
      }
    } else if (response.statusCode === 200) {
      // Unknown protocol. Keeping it because of the backward compatibility
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
   *
   * @param {string} url
   * @returns {string | null}
   */
  getSessionIdFromUrl(url) {
    const match = url.match(/\/session\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async proxyReqRes(req, res) {
    // ! this method must not throw any exceptions
    // ! make sure to call res.send before return
    /** @type {number} */
    let statusCode;
    /** @type {import('@appium/types').HTTPBody} */
    let resBodyObj;
    try {
      let response;
      [response, resBodyObj] = await this.proxyCommand(
        req.originalUrl,
        /** @type {import('@appium/types').HTTPMethod} */ (req.method),
        req.body
      );
      statusCode = response.statusCode;
    } catch (err) {
      [statusCode, resBodyObj] = getResponseForW3CError(
        isErrorType(err, errors.ProxyRequestError) ? err.getActualError() : err
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

    // if the proxied response contains a sessionId that the downstream
    // driver has generated, we don't want to return that to the client.
    // Instead, return the id from the request or from current session
    if (_.has(resBodyObj, 'sessionId')) {
      const reqSessionId = this.getSessionIdFromUrl(req.originalUrl);
      if (reqSessionId) {
        this.log.info(`Replacing sessionId ${resBodyObj.sessionId} with ${reqSessionId}`);
        resBodyObj.sessionId = reqSessionId;
      } else if (this.sessionId) {
        this.log.info(`Replacing sessionId ${resBodyObj.sessionId} with ${this.sessionId}`);
        resBodyObj.sessionId = this.sessionId;
      }
    }
    resBodyObj.value = formatResponseValue(resBodyObj.value);
    res.status(statusCode).send(JSON.stringify(formatStatus(resBodyObj)));
  }

  /**
   *
   * @param {string} url
   * @returns {ParsedUrl}
   */
  _parseUrl(url) {
    const parsedUrl = nodeUrl.parse(url || '/');
    if (
      _.isNil(parsedUrl.href) || _.isNil(parsedUrl.pathname)
      || (parsedUrl.protocol && !['http:', 'https:'].includes(parsedUrl.protocol))
    ) {
      throw new Error(`Did not know how to proxy the url '${url}'`);
    }
    return parsedUrl;
  }

  /**
   *
   * @param {ParsedUrl} parsedUrl
   * @returns {string}
   */
  _toNormalizedPathname(parsedUrl) {
    if (!_.isString(parsedUrl.pathname)) {
      return '';
    }
    let pathname = this.reqBasePath && parsedUrl.pathname.startsWith(this.reqBasePath)
      ? parsedUrl.pathname.replace(this.reqBasePath, '')
      : parsedUrl.pathname;
    const match = COMMAND_WITH_SESSION_ID_MATCHER(pathname);
    // This is needed for the backward compatibility
    // if drivers don't set reqBasePath properly
    if (!this.reqBasePath) {
      if (match && _.isArray(match.params?.prefix)) {
        pathname = pathname.replace(`/${match.params?.prefix.join('/')}`, '');
      } else if (_.startsWith(pathname, '/wd/hub')) {
        pathname = pathname.replace('/wd/hub', '');
      }
    }
    let result = pathname;
    if (match) {
      result = _.isArray(match.params?.command) ? `/${match.params.command.join('/')}` : '';
    }
    return _.trimEnd(result, '/');
  }
}

export default JWProxy;

/**
 * @typedef {Error & {response: {data: import('type-fest').JsonObject, status: import('http-status-codes').StatusCodes}}} ProxyError
 * @typedef {nodeUrl.UrlWithStringQuery} ParsedUrl
 * @typedef {typeof PROTOCOLS[keyof typeof PROTOCOLS]} Protocol
 */
