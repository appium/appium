import _ from 'lodash';
import { logger, util } from 'appium-support';
import { duplicateKeys } from '../basedriver/helpers';
import { PROTOCOLS, MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY } from '../protocol/protocol';
import { formatStatus } from '../protocol/helpers';

const log = logger.getLogger('Protocol Converter');


export const COMMAND_URLS_CONFLICTS = [
  {
    commandNames: ['execute', 'executeAsync'],
    jsonwpConverter: (url) => url.replace(/\/execute.*/,
      url.includes('async') ? '/execute_async' : '/execute'),
    w3cConverter: (url) => url.replace(/\/execute.*/,
      url.includes('async') ? '/execute/async' : '/execute/sync'),
  },
  {
    commandNames: ['getElementScreenshot'],
    jsonwpConverter: (url) => url.replace(/\/element\/([^/]+)\/screenshot$/,
      '/screenshot/$1'),
    w3cConverter: (url) => url.replace(/\/screenshot\/([^/]+)/,
      '/element/$1/screenshot'),
  },
  {
    commandNames: ['getWindowHandles', 'getWindowHandle'],
    jsonwpConverter (url) {
      return /\/window$/.test(url)
        ? url.replace(/\/window$/, '/window_handle')
        : url.replace(/\/window\/handle(s?)$/, '/window_handle$1');
    },
    w3cConverter (url) {
      return /\/window_handle$/.test(url)
        ? url.replace(/\/window_handle$/, '/window')
        : url.replace(/\/window_handles$/, '/window/handles');
    },
  },
  {
    commandNames: ['getProperty'],
    jsonwpConverter: (w3cUrl) => {
      const w3cPropertyRegex = /\/element\/([^/]+)\/property\/([^/]+)/;
      const jsonwpUrl = w3cUrl.replace(w3cPropertyRegex, '/element/$1/attribute/$2');
      log.info(`Converting W3C '${w3cUrl}' to '${jsonwpUrl}'`);
      return jsonwpUrl;
    },
    w3cConverter: (jsonwpUrl) => jsonwpUrl // Don't convert JSONWP URL to W3C. W3C accepts /attribute and /property
  }
];

const {MJSONWP, W3C} = PROTOCOLS;


class ProtocolConverter {
  constructor (proxyFunc) {
    this.proxyFunc = proxyFunc;
    this._downstreamProtocol = null;
  }

  set downstreamProtocol (value) {
    this._downstreamProtocol = value;
  }

  get downstreamProtocol () {
    return this._downstreamProtocol;
  }

  /**
   * W3C /timeouts can take as many as 3 timeout types at once, MJSONWP /timeouts only takes one
   * at a time. So if we're using W3C and proxying to MJSONWP and there's more than one timeout type
   * provided in the request, we need to do 3 proxies and combine the result
   *
   * @param {Object} body Request body
   * @return {Array} Array of W3C + MJSONWP compatible timeout objects
   */
  getTimeoutRequestObjects (body) {
    if (this.downstreamProtocol === W3C && _.has(body, 'ms') && _.has(body, 'type')) {
      const typeToW3C = (x) => x === 'page load' ? 'pageLoad' : x;
      return [{
        [typeToW3C(body.type)]: body.ms,
      }];
    }

    if (this.downstreamProtocol === MJSONWP && (!_.has(body, 'ms') || !_.has(body, 'type'))) {
      const typeToJSONWP = (x) => x === 'pageLoad' ? 'page load' : x;
      return _.toPairs(body)
        // Only transform the entry if ms value is a valid positive float number
        .filter((pair) => /^\d+(?:[.,]\d*?)?$/.test(`${pair[1]}`))
        .map(function (pair) {
          return {
            type: typeToJSONWP(pair[0]),
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

    const timeoutRequestObjects = this.getTimeoutRequestObjects(body);
    log.debug(`Will send the following request bodies to /timeouts: ${JSON.stringify(timeoutRequestObjects)}`);
    for (const timeoutObj of timeoutRequestObjects) {
      [response, resBody] = await this.proxyFunc(url, method, timeoutObj);

      // If we got a non-MJSONWP response, return the result, nothing left to do
      if (this.downstreamProtocol !== MJSONWP) {
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

  async proxySetWindow (url, method, body) {
    const bodyObj = util.safeJsonParse(body);
    if (_.isPlainObject(bodyObj)) {
      if (this.downstreamProtocol === W3C && _.has(bodyObj, 'name') && !_.has(bodyObj, 'handle')) {
        log.debug(`Copied 'name' value '${bodyObj.name}' to 'handle' as per W3C spec`);
        return await this.proxyFunc(url, method, {
          ...bodyObj,
          handle: bodyObj.name,
        });
      }
      if (this.downstreamProtocol === MJSONWP && _.has(bodyObj, 'handle') && !_.has(bodyObj, 'name')) {
        log.debug(`Copied 'handle' value '${bodyObj.handle}' to 'name' as per JSONWP spec`);
        return await this.proxyFunc(url, method, {
          ...bodyObj,
          name: bodyObj.handle,
        });
      }
    }

    return await this.proxyFunc(url, method, body);
  }

  async proxySetValue (url, method, body) {
    const bodyObj = util.safeJsonParse(body);
    if (_.isPlainObject(bodyObj) && (util.hasValue(bodyObj.text) || util.hasValue(bodyObj.value))) {
      let {text, value} = bodyObj;
      if (util.hasValue(text) && !util.hasValue(value)) {
        value = _.isString(text)
          ? [...text]
          : (_.isArray(text) ? text : []);
        log.debug(`Added 'value' property ${JSON.stringify(value)} to 'setValue' request body`);
      } else if (!util.hasValue(text) && util.hasValue(value)) {
        text = _.isArray(value)
          ? value.join('')
          : (_.isString(value) ? value : '');
        log.debug(`Added 'text' property ${JSON.stringify(text)} to 'setValue' request body`);
      }
      return await this.proxyFunc(url, method, Object.assign({}, bodyObj, {
        text,
        value,
      }));
    }

    return await this.proxyFunc(url, method, body);
  }

  async proxySetFrame (url, method, body) {
    const bodyObj = util.safeJsonParse(body);
    return _.has(bodyObj, 'id') && _.isPlainObject(bodyObj.id)
      ? await this.proxyFunc(url, method, {
        ...bodyObj,
        id: duplicateKeys(bodyObj.id, MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY),
      })
      : await this.proxyFunc(url, method, body);
  }

  async proxyPerformActions (url, method, body) {
    const bodyObj = util.safeJsonParse(body);
    return _.isPlainObject(bodyObj)
      ? await this.proxyFunc(url, method, duplicateKeys(bodyObj, MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY))
      : await this.proxyFunc(url, method, body);
  }

  /**
   * Handle "crossing" endpoints for the case
   * when upstream and downstream drivers operate different protocols
   *
   * @param {string} commandName
   * @param {string} url
   * @param {string} method
   * @param {?string|object} body
   * @returns The proxyfying result as [response, responseBody] tuple
   */
  async convertAndProxy (commandName, url, method, body) {
    if (!this.downstreamProtocol) {
      // Patch calls with GENERIC protocol
      // to preserve the backward compatibility
      const [res, resBodyObj] = await this.proxyFunc(url, method, body);
      return [res, formatStatus(resBodyObj, res.statusCode)];
    }

    // Same url, but different arguments
    switch (commandName) {
      case 'timeouts':
        return await this.proxySetTimeouts(url, method, body);
      case 'setWindow':
        return await this.proxySetWindow(url, method, body);
      case 'setValue':
        return await this.proxySetValue(url, method, body);
      case 'performActions':
        return await this.proxyPerformActions(url, method, body);
      case 'setFrame':
        return await this.proxySetFrame(url, method, body);
      default:
        break;
    }

    // Same arguments, but different URLs
    for (const {commandNames, jsonwpConverter, w3cConverter} of COMMAND_URLS_CONFLICTS) {
      if (!commandNames.includes(commandName)) {
        continue;
      }

      const rewrittenUrl = this.downstreamProtocol === MJSONWP
        ? jsonwpConverter(url)
        : w3cConverter(url);
      if (rewrittenUrl === url) {
        log.debug(`Did not know how to rewrite the original URL '${url}' ` +
          `for ${this.downstreamProtocol} protocol`);
        break;
      }
      log.info(`Rewrote the original URL '${url}' to '${rewrittenUrl}' ` +
        `for ${this.downstreamProtocol} protocol`);
      return await this.proxyFunc(rewrittenUrl, method, body);
    }

    // No matches found. Proceed normally
    return await this.proxyFunc(url, method, body);
  }
}

export default ProtocolConverter;
