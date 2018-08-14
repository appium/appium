import _ from 'lodash';
import { logger, util } from 'appium-support';
import request from 'request-promise';
import { getSummaryByCode } from '../jsonwp-status/status';
import { errors, isErrorType, errorFromMJSONWPStatusCode, errorFromW3CJsonCode } from '../protocol/errors';
import BaseDriver from '../basedriver/driver';
import { routeToCommandName } from '../protocol/routes';


const log = logger.getLogger('JSONWP Proxy');
// TODO: Make this value configurable as a server side capability
const LOG_OBJ_LENGTH = 1024; // MAX LENGTH Logged to file / console
const DEFAULT_REQUEST_TIMEOUT = 240000;

const COMMAND_URLS_CONFLICTS = [
  {
    commandNames: ['execute', 'executeAsync'],
    jsonwpConverter: (url) => url.replace(/\/execute.*/,
      url.includes('async') ? '/execute_async' : '/execute'),
    w3cConverter: (url) => url.replace(/\/execute.*/,
      url.includes('async') ? '/execute/async' : '/execute/sync'),
  },
  {
    commandNames: ['getElementScreenshot'],
    jsonwpConverter: (url) => url.replace(/\/element\/([^\/]+)\/screenshot$/,
      '/screenshot/$1'),
    w3cConverter: (url) => url.replace(/\/screenshot\/([^\/]+)/,
      '/element/$1/screenshot'),
  },
];

const {MJSONWP, W3C} = BaseDriver.DRIVER_PROTOCOL;

class JWProxy {
  constructor (opts = {}) {
    Object.assign(this, {
      scheme: 'http',
      server: 'localhost',
      port: 4444,
      base: '/wd/hub',
      sessionId: null,
      timeout: DEFAULT_REQUEST_TIMEOUT,
    }, opts);
    this.scheme = this.scheme.toLowerCase();
    this._activeRequests = [];
  }

  // abstract the call behind a member function
  // so that we can mock it in tests
  async request (...args) {
    const currentRequest = request(...args);
    this._activeRequests.push(currentRequest);
    return await currentRequest.finally(() => _.pull(this._activeRequests, currentRequest));
  }

  getActiveRequestsCount () {
    return this._activeRequests.length;
  }

  cancelActiveRequests () {
    try {
      for (let r of this._activeRequests) {
        r.cancel();
      }
    } finally {
      this._activeRequests = [];
    }
  }

  endpointRequiresSessionId (endpoint) {
    return !_.includes(['/session', '/sessions', '/status'], endpoint);
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
    const reqOpts = {
      url: newUrl,
      method,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'user-agent': 'appium',
        accept: '*/*',
      },
      resolveWithFullResponse: true,
      timeout: this.timeout,
      forever: true,
    };
    if (body !== null) {
      if (typeof body !== 'object') {
        body = JSON.parse(body);
      }
      reqOpts.json = body;
    }

    // GET methods shouldn't have any body. Most servers are OK with this, but WebDriverAgent throws 400 errors
    if (method === 'GET') {
      reqOpts.json = null;
    }

    log.debug(`Proxying [${method} ${url || "/"}] to [${method} ${newUrl}] ` +
             (body ? `with body: ${_.truncate(JSON.stringify(body), {length: LOG_OBJ_LENGTH})}` : 'with no body'));

    let res, resBody;
    try {
      res = await this.request(reqOpts);
      resBody = res.body;
      log.debug(`Got response with status ${res.statusCode}: ${_.truncate(JSON.stringify(resBody), {length: LOG_OBJ_LENGTH})}`);
      if (/\/session$/.test(url) && method === 'POST') {
        if (res.statusCode === 200) {
          this.sessionId = resBody.sessionId;
        } else if (res.statusCode === 303) {
          this.sessionId = /\/session\/([^\/]+)/.exec(resBody)[1];
        }
      }
      const resBodyObj = util.safeJsonParse(resBody);
      if (!this._downstreamProtocol) {
        this._downstreamProtocol = this.getProtocolFromResBody(resBodyObj);
      }
      if (res.statusCode < 400 && this._downstreamProtocol === MJSONWP && parseInt(resBodyObj.status, 10) !== 0) {
        // Some servers, like chromedriver may return response code 200 for non-zero JSONWP statuses
        const message = `The request to ${url} has failed`;
        const err = new Error(message);
        err.message = message;
        err.error = resBody;
        err.statusCode = 500;
        throw err;
      }
    } catch (e) {
      let responseError;
      try {
        responseError = JSON.parse(e.error);
      } catch (e1) {
        if (!_.isEmpty(e.error) && _.isString(e.error)) {
          log.warn(`Got an unexpected response: ${_.truncate(e.error, {length: 300})}`);
        }
        responseError = _.isPlainObject(e.error) ? e.error : null;
      }
      throw new errors.ProxyRequestError(`Could not proxy command to remote server. `  +
                            `Original error: ${e.message}`, responseError, e.statusCode);
    }
    return [res, resBody];
  }

  /**
   * W3C /timeouts can take as many as 3 timeout types at once, MJSONWP /timeouts only takes one
   * at a time. So if we're using W3C and proxying to MJSONWP and there's more than one timeout type
   * provided in the request, we need to do 3 proxies and combine the result
   *
   * @param {Object} body Request body
   * @return {Array} Array of W3C + MJSONWP compatible timeout objects
   */
  async getTimeoutRequestObjects (body) {
    let downstreamProtocol;
    try {
      downstreamProtocol = await this.getDownstreamProtocol();
    } catch (err) {
      log.warn(err);
    }
    if (!downstreamProtocol) {
      log.warn('The downstream protocol cannot be detected. Proxying the request body to /timeouts as is');
      return [body];
    }

    if (downstreamProtocol === W3C && _.has(body, 'ms') && _.has(body, 'type')) {
      return [{
        [body.type]: body.ms,
      }];
    }

    if (downstreamProtocol === MJSONWP && (!_.has(body, 'ms') || !_.has(body, 'type'))) {
      return _.toPairs(body)
        .filter((pair) => !isNaN(parseFloat(pair[1])))
        .map((pair) => {
          return {
            type: pair[0],
            ms: pair[1],
          };
        });
    }

    return [body];
  }

  /**
   * Proxy an array of timeout objects and merge the result
   * @param {String} url Endpoint url
   * @param {String} method Endpoint method
   * @param {Object} body Request body
   */
  async proxySetTimeouts (url, method, body) {
    let response, resBody;

    const timeoutRequestObjects = await this.getTimeoutRequestObjects(body);
    log.debug(`Will send the following request bodies to /timeouts: ${JSON.stringify(timeoutRequestObjects)}`);
    for (const timeoutObj of timeoutRequestObjects) {
      [response, resBody] = await this.proxy(url, method, timeoutObj);

      const protocol = this.getProtocolFromResBody(resBody);

      // If we got a non-MJSONWP response, return the result, nothing left to do
      if (protocol !== MJSONWP) {
        return [response, resBody];
      }

      // If we got an error, return the error right away
      if (response.statusCode >= 400) {
        return [response, resBody];
      }

      // ...Otherwise, continue to the next timeouts call
    }
    return [response, resBody];
  }

  getProtocolFromResBody (resBody) {
    if (!_.isPlainObject(resBody)) {
      try {
        resBody = JSON.parse(resBody);
      } catch (err) {
        return;
      }
    }
    if (util.hasValue(resBody.status)) {
      return MJSONWP;
    }
    if (util.hasValue(resBody.value)) {
      return W3C;
    }
  }

  async getDownstreamProtocol () {
    if (!this._downstreamProtocol) {
      const [, resBody] = await this.proxy('/status', 'GET');
      this._downstreamProtocol = this.getProtocolFromResBody(resBody);
    }
    return this._downstreamProtocol;
  }

  requestToCommandName (url, method) {
    const extractCommandName = (pattern) => {
      const pathMatch = pattern.exec(url);
      return pathMatch ? routeToCommandName(pathMatch[1], method) : null;
    };
    let commandName = routeToCommandName(url, method);
    if (!commandName && _.includes(url, '/wd/hub/session/')) {
      commandName = extractCommandName(/\/wd\/hub\/session\/[^\/]+(.+)/);
    }
    if (!commandName && _.includes(url, '/wd/hub/')) {
      commandName = extractCommandName(/\/wd\/hub(\/.+)/);
    }
    return commandName;
  }

  async proxyCommand (url, method, body = null) {
    const commandName = this.requestToCommandName(url, method);
    if (!commandName) {
      return await this.proxy(url, method, body);
    }
    log.debug(`Matched '${url}' to command name '${commandName}'`);

    // Handle "crossing" endpoints for the case
    // when upstream and downstream drivers operate different protocols

    // Same url, but different arguments

    if (commandName === 'timeouts')  {
      return await this.proxySetTimeouts(url, method, body);
    }

    // Same arguments, but different URLs

    for (const {commandNames, jsonwpConverter, w3cConverter} of COMMAND_URLS_CONFLICTS) {
      if (!commandNames.includes(commandName)) {
        continue;
      }

      let downstreamProtocol;
      try {
        downstreamProtocol = await this.getDownstreamProtocol();
      } catch (err) {
        log.warn(err);
      }
      if (!downstreamProtocol) {
        log.warn('The downstream protocol cannot be detected. Proxying as is');
        break;
      }
      const rewrittenUrl = downstreamProtocol === MJSONWP
        ? jsonwpConverter(url)
        : w3cConverter(url);
      if (rewrittenUrl === url) {
        log.debug(`Did not know how to rewrite the original URL '${url}' ` +
          `for ${downstreamProtocol} protocol`);
        break;
      }
      log.info(`Rewrote the original URL '${url}' to '${rewrittenUrl}' ` +
        `for ${downstreamProtocol} protocol`);
      return await this.proxy(rewrittenUrl, method, body);
    }

    // No matches found. Proceed normally
    return await this.proxy(url, method, body);
  }

  async command (url, method, body = null) {
    let response;
    let resBody;
    try {
      [response, resBody] = await this.proxyCommand(url, method, body);
    } catch (err) {
      if (isErrorType(err, errors.ProxyRequestError)) {
        throw err.getActualError();
      }
      throw new errors.UnknownError(err.message);
    }
    resBody = util.safeJsonParse(resBody);
    let protocol = this.getProtocolFromResBody(resBody);
    if (protocol === MJSONWP) {
      // Got response in MJSONWP format
      if (response.statusCode === 200 && resBody.status === 0) {
        return resBody.value;
      }
      const status = parseInt(resBody.status, 10);
      if (!isNaN(status) && status !== 0) {
        let message = resBody.value;
        if (_.has(resBody.value, 'message')) {
          message = _.isEmpty(message) ? resBody.value.message : `${message} ${resBody.value.message}`;
        }
        throw errorFromMJSONWPStatusCode(status, _.isEmpty(message) ? getSummaryByCode(status) : message);
      }
    } else if (protocol === W3C) {
      // Got response in W3C format
      if (response.statusCode < 300) {
        return resBody.value;
      }
      if (_.isPlainObject(resBody.value) && resBody.value.error) {
        throw errorFromW3CJsonCode(resBody.value.error, resBody.value.message, resBody.value.stacktrace);
      }
    } else if (response.statusCode === 200) {
      // Unknown protocol. Keeping it because of the backward compatibility
      return resBody;
    }
    throw new errors.UnknownError(`Did not know what to do with response code '${response.statusCode}' ` +
                                  `and response body '${_.truncate(JSON.stringify(resBody), {length: 300})}'`);
  }

  getSessionIdFromUrl (url) {
    const match = url.match(/\/session\/([^\/]+)/);
    return match ? match[1] : null;
  }

  async proxyReqRes (req, res) {
    let [response, body] = await this.proxyCommand(req.originalUrl, req.method, req.body);

    res.headers = response.headers;
    res.set('content-type', response.headers['content-type']);
    // if the proxied response contains a sessionId that the downstream
    // driver has generated, we don't want to return that to the client.
    // Instead, return the id from the request or from current session
    body = util.safeJsonParse(body);
    if (body && body.sessionId) {
      const reqSessionId = this.getSessionIdFromUrl(req.originalUrl);
      if (reqSessionId) {
        log.info(`Replacing sessionId ${body.sessionId} with ${reqSessionId}`);
        body.sessionId = reqSessionId;
      } else if (this.sessionId) {
        log.info(`Replacing sessionId ${body.sessionId} with ${this.sessionId}`);
        body.sessionId = this.sessionId;
      }
    }
    res.status(response.statusCode).send(JSON.stringify(body));
  }
}

export default JWProxy;
