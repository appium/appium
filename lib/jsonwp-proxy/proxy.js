import _ from 'lodash';
import { getLogger } from 'appium-logger';
import { util } from 'appium-support';
import request from 'request-promise';
import { getSummaryByCode } from '../jsonwp-status/status';


const log = getLogger('JSONWP Proxy');

class JWProxy {
  constructor (opts = {}) {
    Object.assign(this, {
      scheme: 'http',
      server: 'localhost',
      port: 4444,
      base: '/wd/hub',
      sessionId: null
    }, opts);
    this.scheme = this.scheme.toLowerCase();
  }

  // abstract the call behind a member function
  // so that we can mock it in tests
  async request (...args) {
    return await request(...args);
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

    const stripPrefixRe = new RegExp('^.+(/(session|status).*)$');
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
      headers: {'Content-type': 'application/json;charset=UTF-8'},
      resolveWithFullResponse: true
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

    log.info(`Proxying [${method} ${url || "/"}] to [${method} ${newUrl}] ` +
             (body ? `with body: ${_.truncate(JSON.stringify(body), 200)}` : 'with no body'));
    let res, resBody;
    try {
      res = await this.request(reqOpts);
      resBody = res.body;
      log.info(`Got response with status ${res.statusCode}: ${_.truncate(JSON.stringify(resBody), 200)}`);
      if (/\/session$/.test(url) && method === 'POST') {
        if (res.statusCode === 200) {
          this.sessionId = resBody.sessionId;
        } else if (res.statusCode === 303) {
          this.sessionId = /\/session\/([^\/]+)/.exec(resBody)[1];
        }
      }
    } catch (e) {
      throw new Error(`Could not proxy command to remote server. ` +
                      `Original error: ${e.message}`);
    }
    return [res, resBody];
  }

  async command (url, method, body = null) {
    let [response, resBody] = await this.proxy(url, method, body);
    let statusCodesWithRes = [100, 200, 500];
    resBody = util.safeJsonParse(resBody);
    if (_.includes(statusCodesWithRes, response.statusCode) &&
        (_.isUndefined(resBody.status) || _.isUndefined(resBody.value))) {
      throw new Error(`Did not get a valid response object. Object was: ${JSON.stringify(resBody)}`);
    }
    if (_.includes(statusCodesWithRes, response.statusCode)) {
      if (response.statusCode === 200 && resBody.status === 0) {
        return resBody.value;
      } else if (response.statusCode === 200) {
        return resBody;
      }
      let message = getSummaryByCode(resBody.status);
      if (resBody.value.message) {
        message += ` (Original error: ${resBody.value.message})`;
      }
      let e = new Error(message);
      e.status = resBody.status;
      e.value = resBody.value;
      e.httpCode = response.statusCode;
      throw e;
    }
    throw new Error(`Didn't know what to do with response code '${response.statusCode}'`);
  }

  getSessionIdFromUrl (url) {
    const match = url.match(/\/session\/([^\/]+)/);
    return match ? match[1] : null;
  }

  async proxyReqRes (req, res) {
    let [response, body] = await this.proxy(req.originalUrl, req.method, req.body);
    res.headers = response.headers;
    res.set('Content-type', response.headers['content-type']);
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
