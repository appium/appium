import _ from 'lodash';
import { logger, util } from 'appium-support';
import axios from 'axios';
import { getSummaryByCode } from '../jsonwp-status/status';
import {
  errors, isErrorType, errorFromMJSONWPStatusCode, errorFromW3CJsonCode
} from '../protocol/errors';
import { routeToCommandName } from '../protocol';
import { MAX_LOG_BODY_LENGTH, DEFAULT_BASE_PATH, PROTOCOLS } from '../constants';
import ProtocolConverter from './protocol-converter';
import { formatResponseValue, formatStatus } from '../protocol/helpers';
import SESSIONS_CACHE from '../protocol/sessions-cache';
import http from 'http';
import https from 'https';


const log = logger.getLogger('WD Proxy');
const DEFAULT_REQUEST_TIMEOUT = 240000;
const COMPACT_ERROR_PATTERNS = [
  /\bECONNREFUSED\b/,
  /socket hang up/,
];

const {MJSONWP, W3C} = PROTOCOLS;

class JWProxy {
  constructor (opts = {}) {
    _.defaults(this, opts, {
      scheme: 'http',
      server: 'localhost',
      port: 4444,
      base: DEFAULT_BASE_PATH,
      reqBasePath: DEFAULT_BASE_PATH,
      sessionId: null,
      timeout: DEFAULT_REQUEST_TIMEOUT,
    });
    this.scheme = this.scheme.toLowerCase();
    this._activeRequests = [];
    this._downstreamProtocol = null;
    const agentOpts = {
      keepAlive: opts.keepAlive ?? true,
      maxSockets: 10,
      maxFreeSockets: 5,
    };
    this.httpAgent = new http.Agent(agentOpts);
    this.httpsAgent = new https.Agent(agentOpts);
    this.protocolConverter = new ProtocolConverter(this.proxy.bind(this));
  }

  /**
   * Performs requests to the downstream server
   *
   * @private - Do not call this method directly,
   * it uses client-specific arguments and responses!
   *
   * @param {AxiosRequestConfig} requestConfig
   * @returns {AxiosResponse}
   */
  async request (requestConfig) {
    const reqPromise = axios(requestConfig);
    this._activeRequests.push(reqPromise);
    try {
      return await reqPromise;
    } finally {
      _.pull(this._activeRequests, reqPromise);
    }
  }

  getActiveRequestsCount () {
    return this._activeRequests.length;
  }

  cancelActiveRequests () {
    this._activeRequests = [];
  }

  endpointRequiresSessionId (endpoint) {
    return !_.includes(['/session', '/sessions', '/status'], endpoint);
  }

  set downstreamProtocol (value) {
    this._downstreamProtocol = value;
    this.protocolConverter.downstreamProtocol = value;
  }

  get downstreamProtocol () {
    return this._downstreamProtocol;
  }

  getUrlForProxy (url) {
    if (url === '') {
      url = '/';
    }
    const proxyBase = `${this.scheme}://${this.server}:${this.port}${this.base}`;
    const endpointRe = '(/(session|status))';
    let remainingUrl = '';
    if (/^http/.test(url)) {
      const first = (new RegExp(`(https?://.+)${endpointRe}`)).exec(url);
      if (!first) {
        throw new Error('Got a complete url but could not extract JWP endpoint');
      }
      remainingUrl = url.replace(first[1], '');
    } else if ((new RegExp('^/')).test(url)) {
      remainingUrl = url;
    } else {
      throw new Error(`Did not know what to do with url '${url}'`);
    }

    const stripPrefixRe = new RegExp('^.*?(/(session|status).*)$');
    if (stripPrefixRe.test(remainingUrl)) {
      remainingUrl = stripPrefixRe.exec(remainingUrl)[1];
    }

    if (!(new RegExp(endpointRe)).test(remainingUrl)) {
      remainingUrl = `/session/${this.sessionId}${remainingUrl}`;
    }

    const requiresSessionId = this.endpointRequiresSessionId(remainingUrl);

    if (requiresSessionId && this.sessionId === null) {
      throw new Error('Trying to proxy a session command without session id');
    }

    const sessionBaseRe = new RegExp('^/session/([^/]+)');
    if (sessionBaseRe.test(remainingUrl)) {
      // we have something like /session/:id/foobar, so we need to replace
      // the session id
      const match = sessionBaseRe.exec(remainingUrl);
      remainingUrl = remainingUrl.replace(match[1], this.sessionId);
    } else if (requiresSessionId) {
      throw new Error(`Could not find :session section for url: ${remainingUrl}`);
    }
    remainingUrl = remainingUrl.replace(/\/$/, ''); // can't have trailing slashes

    return proxyBase + remainingUrl;
  }

  async proxy (url, method, body = null) {
    method = method.toUpperCase();
    const newUrl = this.getUrlForProxy(url);
    const truncateBody = (content) => _.truncate(
      _.isString(content) ? content : JSON.stringify(content),
      { length: MAX_LOG_BODY_LENGTH });
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

    log.debug(`Proxying [${method} ${url || '/'}] to [${method} ${newUrl}] ` +
      (reqOpts.data ? `with body: ${truncateBody(reqOpts.data)}` : 'with no body'));

    const throwProxyError = (error) => {
      const err = new Error(`The request to ${url} has failed`);
      err.response = {
        data: error,
        status: 500
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
      log.debug(`Got response with status ${status}: ${truncateBody(data)}`);
      isResponseLogged = true;
      const isSessionCreationRequest = /\/session$/.test(url) && method === 'POST';
      if (isSessionCreationRequest) {
        if (status === 200) {
          this.sessionId = data.sessionId || (data.value || {}).sessionId;
        }
        this.downstreamProtocol = this.getProtocolFromResBody(data);
        log.info(`Determined the downstream protocol as '${this.downstreamProtocol}'`);
      }
      if (_.has(data, 'status') && parseInt(data.status, 10) !== 0) {
        // Some servers, like chromedriver may return response code 200 for non-zero JSONWP statuses
        throwProxyError(data);
      }
      const res = {statusCode: status, headers, body: data};
      return [res, data];
    } catch (e) {
      // We only consider an error unexpected if this was not
      // an async request module error or if the response cannot be cast to
      // a valid JSON
      let proxyErrorMsg = e.message;
      if (util.hasValue(e.response)) {
        if (!isResponseLogged) {
          const error = truncateBody(e.response.data);
          log.info(util.hasValue(e.response.status)
            ? `Got response with status ${e.response.status}: ${error}`
            : `Got response with unknown status: ${error}`);
        }
      } else {
        proxyErrorMsg = `Could not proxy command to the remote server. Original error: ${e.message}`;
        if (COMPACT_ERROR_PATTERNS.some((p) => p.test(e.message))) {
          log.info(e.message);
        } else {
          log.info(e.stack);
        }
      }
      throw new errors.ProxyRequestError(proxyErrorMsg, e.response?.data, e.response?.status);
    }
  }

  getProtocolFromResBody (resObj) {
    if (_.isInteger(resObj.status)) {
      return MJSONWP;
    }
    if (!_.isUndefined(resObj.value)) {
      return W3C;
    }
  }

  requestToCommandName (url, method) {
    const extractCommandName = (pattern) => {
      const pathMatch = pattern.exec(url);
      return pathMatch ? routeToCommandName(pathMatch[1], method, this.reqBasePath) : null;
    };
    let commandName = routeToCommandName(url, method, this.reqBasePath);
    if (!commandName && _.includes(url, `${this.reqBasePath}/session/`)) {
      commandName = extractCommandName(new RegExp(`${_.escapeRegExp(this.reqBasePath)}/session/[^/]+(.+)`));
    }
    if (!commandName && _.includes(url, this.reqBasePath)) {
      commandName = extractCommandName(new RegExp(`${_.escapeRegExp(this.reqBasePath)}(/.+)`));
    }
    return commandName;
  }

  async proxyCommand (url, method, body = null) {
    const commandName = this.requestToCommandName(url, method);
    if (!commandName) {
      return await this.proxy(url, method, body);
    }
    log.debug(`Matched '${url}' to command name '${commandName}'`);

    return await this.protocolConverter.convertAndProxy(commandName, url, method, body);
  }

  async command (url, method, body = null) {
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
        throw errorFromMJSONWPStatusCode(status, _.isEmpty(message) ? getSummaryByCode(status) : message);
      }
    } else if (protocol === W3C) {
      // Got response in W3C format
      if (response.statusCode < 300) {
        return resBodyObj.value;
      }
      if (_.isPlainObject(resBodyObj.value) && resBodyObj.value.error) {
        throw errorFromW3CJsonCode(resBodyObj.value.error, resBodyObj.value.message, resBodyObj.value.stacktrace);
      }
    } else if (response.statusCode === 200) {
      // Unknown protocol. Keeping it because of the backward compatibility
      return resBodyObj;
    }
    throw new errors.UnknownError(`Did not know what to do with response code '${response.statusCode}' ` +
                                  `and response body '${_.truncate(JSON.stringify(resBodyObj), {length: 300})}'`);
  }

  getSessionIdFromUrl (url) {
    const match = url.match(/\/session\/([^/]+)/);
    return match ? match[1] : null;
  }

  async proxyReqRes (req, res) {
    const [response, resBodyObj] = await this.proxyCommand(req.originalUrl, req.method, req.body);

    res.headers = response.headers;
    res.set('content-type', response.headers['content-type']);
    // if the proxied response contains a sessionId that the downstream
    // driver has generated, we don't want to return that to the client.
    // Instead, return the id from the request or from current session
    const reqSessionId = this.getSessionIdFromUrl(req.originalUrl);
    if (_.has(resBodyObj, 'sessionId')) {
      if (reqSessionId) {
        log.info(`Replacing sessionId ${resBodyObj.sessionId} with ${reqSessionId}`);
        resBodyObj.sessionId = reqSessionId;
      } else if (this.sessionId) {
        log.info(`Replacing sessionId ${resBodyObj.sessionId} with ${this.sessionId}`);
        resBodyObj.sessionId = this.sessionId;
      }
    }
    resBodyObj.value = formatResponseValue(resBodyObj.value);
    formatStatus(resBodyObj, res.statusCode, SESSIONS_CACHE.getProtocol(reqSessionId));
    res.status(response.statusCode).send(JSON.stringify(resBodyObj));
  }
}

export { JWProxy };
export default JWProxy;
