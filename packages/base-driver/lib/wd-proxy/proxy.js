import _ from 'lodash';
import axios from 'axios';
import {logger, util} from '@appium/support';
import {
  errors,
  isErrorType,
  errorFromW3CJsonCode,
  getResponseForW3CError,
} from '../protocol/errors';
import {routeToCommandName} from '../protocol';
import {MAX_LOG_BODY_LENGTH, DEFAULT_BASE_PATH} from '../constants';
import http from 'http';
import https from 'https';

const DEFAULT_LOG = logger.getLogger('WD Proxy');
const DEFAULT_REQUEST_TIMEOUT = 240000;
const COMPACT_ERROR_PATTERNS = [/\bECONNREFUSED\b/, /socket hang up/];

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

export class WDProxy {
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

  constructor(opts = {}) {
    opts = _.pick(opts, ALLOWED_OPTS);

    // omit 'log' in the defaults assignment here because 'log' is a getter and we are going to set
    // it to this._log (which lies behind the getter) further down
    const options = _.defaults(_.omit(opts, 'log'), {
      scheme: 'http',
      server: 'localhost',
      port: 4444,
      base: DEFAULT_BASE_PATH,
      reqBasePath: DEFAULT_BASE_PATH,
      sessionId: null,
      timeout: DEFAULT_REQUEST_TIMEOUT,
    });
    options.scheme = options.scheme.toLowerCase();
    Object.assign(this, options);

    this._activeRequests = [];
    const agentOpts = {
      keepAlive: opts.keepAlive ?? true,
      maxSockets: 10,
      maxFreeSockets: 5,
    };
    this.httpAgent = new http.Agent(agentOpts);
    this.httpsAgent = new https.Agent(agentOpts);
    this._log = opts.log;
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
   * @param {import('axios').AxiosRequestConfig} requestConfig
   * @returns {Promise<import('axios').AxiosResponse<W3CResponse>>}
   */
  async request(requestConfig) {
    const reqPromise = axios(requestConfig);
    this._activeRequests.push(reqPromise);
    try {
      return await reqPromise;
    } finally {
      _.pull(this._activeRequests, reqPromise);
    }
  }

  getActiveRequestsCount() {
    return this._activeRequests.length;
  }

  cancelActiveRequests() {
    this._activeRequests = [];
  }

  /**
   * @param {string} endpoint
   */
  endpointRequiresSessionId(endpoint) {
    return !_.includes(['/session', '/sessions', '/status'], endpoint);
  }

  /**
   * @param {string} url
   */
  getUrlForProxy(url) {
    if (url === '') {
      url = '/';
    }
    const proxyBase = `${this.scheme}://${this.server}:${this.port}${this.base}`;
    const endpointRe = '(/(session|status))';
    let remainingUrl = '';
    if (/^http/.test(url)) {
      const first = new RegExp(`(https?://.+)${endpointRe}`).exec(url);
      if (!first) {
        throw new Error('Got a complete url but could not extract a WebDriver endpoint');
      }
      remainingUrl = url.replace(first[1], '');
    } else if (new RegExp('^/').test(url)) {
      remainingUrl = url;
    } else {
      throw new Error(`Did not know what to do with url '${url}'`);
    }

    const stripPrefixRe = new RegExp('^.*?(/(session|status).*)$');
    if (stripPrefixRe.test(remainingUrl)) {
      remainingUrl = /** @type {RegExpExecArray} */ (stripPrefixRe.exec(remainingUrl))[1];
    }

    if (!new RegExp(endpointRe).test(remainingUrl)) {
      remainingUrl = `/session/${this.sessionId}${remainingUrl}`;
    }

    const requiresSessionId = this.endpointRequiresSessionId(remainingUrl);

    if (requiresSessionId && this.sessionId === null) {
      throw new Error('Trying to proxy a session command without session id');
    }

    const sessionBaseRe = new RegExp('^/session/([^/]+)');
    if (sessionBaseRe.test(remainingUrl)) {
      if (this.sessionId === null) {
        throw new ReferenceError(
          `Session ID is not set, but saw a URL path referencing a session (${remainingUrl}). This may be a bug in your client.`
        );
      }
      // we have something like /session/:id/foobar, so we need to replace
      // the session id
      const match = sessionBaseRe.exec(remainingUrl);
      // TODO: if `requiresSessionId` is `false` and `sessionId` is `null`, this is a bug.
      // are we sure `sessionId` is not `null`?
      remainingUrl = remainingUrl.replace(
        /** @type {RegExpExecArray} */ (match)[1],
        /** @type {string} */ (this.sessionId)
      );
    } else if (requiresSessionId) {
      throw new Error(`Could not find :session section for url: ${remainingUrl}`);
    }
    remainingUrl = remainingUrl.replace(/\/$/, ''); // can't have trailing slashes

    return proxyBase + remainingUrl;
  }

  /**
   * @param {string} url
   * @param {string} method
   * @returns {Promise<{status: number, headers: import('axios').AxiosResponseHeaders, data: W3CResponse}>}
   */
  async proxy(url, method, body = null) {
    method = method.toUpperCase();
    const newUrl = this.getUrlForProxy(url);
    const truncateBody = (/** @type {any} */ content) =>
      _.truncate(_.isString(content) ? content : JSON.stringify(content), {
        length: MAX_LOG_BODY_LENGTH,
      });
    /** @type {import('axios').AxiosRequestConfig} */
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
        } catch (e) {
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

    const throwProxyError = (/** @type {any} */ data) => {
      const err = /** @type {ProxyError} */ (new Error(`The request to ${url} has failed`));
      err.response = {
        data,
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
      if (!_.has(data, 'value')) {
        const errMsg = `Expected W3C protocol response to contain a 'value' property`;
        throw new errors.ProxyRequestError(errMsg, data, status);
      }
      isResponseLogged = true;
      const isSessionCreationRequest = /\/session$/.test(url) && method === 'POST';
      if (isSessionCreationRequest && status === 200) {
        if (this.sessionId) {
          this.log.warn(
            `Warning; sessionId was previously set to ${this.sessionId} but ` +
              `will be changed as a result of new session response`
          );
        }
        if (!_.isString(data?.value?.sessionId)) {
          const errMsg = `Expected new session response to contain a 'value.sessionId' property`;
          throw new errors.ProxyRequestError(errMsg, data, status);
        }
        this.sessionId = data.value?.sessionId;
      }
      return {status, headers, data};
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
        if (COMPACT_ERROR_PATTERNS.some((p) => p.test(e.message))) {
          this.log.info(e.message);
        } else {
          this.log.info(e.stack);
        }
      }
      throw new errors.ProxyRequestError(proxyErrorMsg, e.response?.data, e.response?.status);
    }
  }

  /**
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
   * @param {string} url
   * @param {import('@appium/types').HTTPMethod} method
   * @returns {Promise<{status: number, headers: import('axios').AxiosResponseHeaders, data: W3CResponse}>}
   */
  async proxyCommand(url, method, body = null) {
    const commandName = this.requestToCommandName(url, method);
    if (commandName) {
      this.log.debug(`Matched '${url}' to command name '${commandName}'`);
    }
    return await this.proxy(url, method, body);
  }

  /**
   * @param {string} url
   * @param {import('@appium/types').HTTPMethod} method
   * @returns {Promise<any>}
   */
  async command(url, method, body = null) {
    let status, data;
    try {
      ({status, data} = await this.proxyCommand(url, method, body));
    } catch (err) {
      if (isErrorType(err, errors.ProxyRequestError)) {
        throw err.getActualError();
      }
      throw new errors.UnknownError(err.message);
    }
    if (status < 300) {
      return data.value;
    }
    if (_.isPlainObject(data.value) && data.value.error) {
      throw errorFromW3CJsonCode(data.value.error, data.value.message, data.value.stacktrace);
    }
    throw new errors.UnknownError(
      `Did not know what to do with response code '${status}' ` +
        `and response body '${_.truncate(JSON.stringify(data), {
          length: 300,
        })}'`
    );
  }

  /**
   * @param {string} url
   * @returns {string?}
   */
  getSessionIdFromUrl(url) {
    const match = url.match(/\/session\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async proxyReqRes(req, res) {
    // ! this method must not throw any exceptions
    // ! make sure to call res.send before return
    let status, headers, data;
    const method = /** @type {import('@appium/types').HTTPMethod} */ (req.method);
    try {
      ({status, headers, data} = await this.proxyCommand(req.originalUrl, method, req.body));
      res.set(headers);
    } catch (err) {
      [status, data] = getResponseForW3CError(
        isErrorType(err, errors.ProxyRequestError) ? err.getActualError() : err
      );
    }
    res.set('content-type', 'application/json; charset=utf-8');
    if (!_.isPlainObject(data)) {
      const error = new errors.UnknownError(
        `The downstream server response with the status code ${status} is not a valid JSON object: ` +
          _.truncate(`${data}`, {length: 300})
      );
      [status, data] = getResponseForW3CError(error);
    }

    // if the proxied response contains a sessionId that the downstream
    // driver has generated, we don't want to return that to the client.
    // Instead, return the id from the request or from current session
    if (_.has(data, 'sessionId')) {
      const reqSessionId = this.getSessionIdFromUrl(req.originalUrl);
      if (reqSessionId) {
        this.log.info(`Replacing sessionId ${data.sessionId} with ${reqSessionId}`);
        data.sessionId = reqSessionId;
      } else if (this.sessionId) {
        this.log.info(`Replacing sessionId ${data.sessionId} with ${this.sessionId}`);
        data.sessionId = this.sessionId;
      }
    }
    if (data.value === undefined) {
      // we sometimes return undefined from commands as a convenience, but the w3c protocol insists
      // that things are null
      data.value = null;
    }
    res.status(status).send(JSON.stringify(data));
  }
}

export default WDProxy;

/**
 * @typedef {{value: any | {error: string, message: string, stacktrace: string}}} W3CResponse
 * @typedef {Error & {response: {data: import('type-fest').JsonObject, status: import('http-status-codes').StatusCodes}}} ProxyError
 */
