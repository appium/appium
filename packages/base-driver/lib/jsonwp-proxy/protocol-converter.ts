import type {AppiumLogger, HTTPBody, ProxyResponse} from '@appium/types';
import _ from 'lodash';
import {logger, util} from '@appium/support';
import {duplicateKeys} from '../basedriver/helpers';
import {MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY, PROTOCOLS} from '../constants';

export type ProxyFunction = (
  url: string,
  method: string,
  body?: HTTPBody
) => Promise<[ProxyResponse, HTTPBody]>;

export const COMMAND_URLS_CONFLICTS = [
  {
    commandNames: ['execute', 'executeAsync'],
    jsonwpConverter: (url: string) =>
      url.replace(/\/execute.*/, url.includes('async') ? '/execute_async' : '/execute'),
    w3cConverter: (url: string) =>
      url.replace(/\/execute.*/, url.includes('async') ? '/execute/async' : '/execute/sync'),
  },
  {
    commandNames: ['getElementScreenshot'],
    jsonwpConverter: (url: string) => url.replace(/\/element\/([^/]+)\/screenshot$/, '/screenshot/$1'),
    w3cConverter: (url: string) => url.replace(/\/screenshot\/([^/]+)/, '/element/$1/screenshot'),
  },
  {
    commandNames: ['getWindowHandles', 'getWindowHandle'],
    jsonwpConverter(url: string) {
      return url.endsWith('/window')
        ? url.replace(/\/window$/, '/window_handle')
        : url.replace(/\/window\/handle(s?)$/, '/window_handle$1');
    },
    w3cConverter(url: string) {
      return url.endsWith('/window_handle')
        ? url.replace(/\/window_handle$/, '/window')
        : url.replace(/\/window_handles$/, '/window/handles');
    },
  },
  {
    commandNames: ['getProperty'],
    jsonwpConverter: (w3cUrl: string) => {
      const w3cPropertyRegex = /\/element\/([^/]+)\/property\/([^/]+)/;
      return w3cUrl.replace(w3cPropertyRegex, '/element/$1/attribute/$2');
    },
    // Don't convert JSONWP URL to W3C. W3C accepts /attribute and /property
    w3cConverter: (jsonwpUrl: string) => jsonwpUrl,
  },
] as const;

const {MJSONWP, W3C} = PROTOCOLS;
const DEFAULT_LOG = logger.getLogger('Protocol Converter');

export class ProtocolConverter {
  private _downstreamProtocol: string | null | undefined = null;
  private readonly _log: AppiumLogger | null;

  /**
   * @param proxyFunc - Function to perform the actual proxy request
   * @param log - Logger instance, or null to use the default
   */
  constructor(
    public proxyFunc: ProxyFunction,
    log: AppiumLogger | null = null
  ) {
    this._log = log;
  }

  get log(): AppiumLogger {
    return this._log ?? DEFAULT_LOG;
  }

  set downstreamProtocol(value: string | null | undefined) {
    this._downstreamProtocol = value;
  }

  get downstreamProtocol(): string | null | undefined {
    return this._downstreamProtocol;
  }

  /**
   * Handle "crossing" endpoints for the case when upstream and downstream
   * drivers operate different protocols.
   */
  async convertAndProxy(
    commandName: string,
    url: string,
    method: string,
    body?: HTTPBody
  ): Promise<[ProxyResponse, HTTPBody]> {
    if (!this.downstreamProtocol) {
      return await this.proxyFunc(url, method, body);
    }

    // Same url, but different arguments
    switch (commandName) {
      case 'timeouts':
        return await this.proxySetTimeouts(url, method, body ?? {});
      case 'setWindow':
        return await this.proxySetWindow(url, method, body ?? {});
      case 'setValue':
        return await this.proxySetValue(url, method, body ?? {});
      case 'performActions':
        return await this.proxyPerformActions(url, method, body ?? {});
      case 'releaseActions':
        return await this.proxyReleaseActions(url, method);
      case 'setFrame':
        return await this.proxySetFrame(url, method, body ?? {});
      default:
        break;
    }

    // Same arguments, but different URLs
    for (const {commandNames, jsonwpConverter, w3cConverter} of COMMAND_URLS_CONFLICTS) {
      if (!(commandNames as readonly string[]).includes(commandName)) {
        continue;
      }
      const rewrittenUrl =
        this.downstreamProtocol === MJSONWP ? jsonwpConverter(url) : w3cConverter(url);
      if (rewrittenUrl === url) {
        this.log.debug(
          `Did not know how to rewrite the original URL '${url}' for ${this.downstreamProtocol} protocol`
        );
        break;
      }
      this.log.info(
        `Rewrote the original URL '${url}' to '${rewrittenUrl}' for ${this.downstreamProtocol} protocol`
      );
      return await this.proxyFunc(rewrittenUrl, method, body);
    }

    // No matches found. Proceed normally
    return await this.proxyFunc(url, method, body);
  }

  /**
   * W3C /timeouts can take as many as 3 timeout types at once, MJSONWP /timeouts only takes one
   * at a time. So if we're using W3C and proxying to MJSONWP and there's more than one timeout type
   * provided in the request, we need to do 3 proxies and combine the result.
   */
  private getTimeoutRequestObjects(body: Record<string, unknown>): Record<string, unknown>[] {
    if (this.downstreamProtocol === W3C && _.has(body, 'ms') && _.has(body, 'type')) {
      const typeToW3C = (x: string) => (x === 'page load' ? 'pageLoad' : x);
      return [
        {
          [typeToW3C(body.type as string)]: body.ms,
        },
      ];
    }

    if (this.downstreamProtocol === MJSONWP && (!_.has(body, 'ms') || !_.has(body, 'type'))) {
      const typeToJSONWP = (x: string) => (x === 'pageLoad' ? 'page load' : x);
      return _.toPairs(body)
        // Only transform the entry if ms value is a valid positive float number
        .filter((pair) => /^\d+(?:[.,]\d*?)?$/.test(`${pair[1]}`))
        .map((pair) => ({
          type: typeToJSONWP(pair[0]),
          ms: pair[1],
        }));
    }

    return [body];
  }

  /**
   * Proxy an array of timeout objects and merge the result.
   */
  private async proxySetTimeouts(
    url: string,
    method: string,
    body: HTTPBody
  ): Promise<[ProxyResponse, HTTPBody]> {
    const timeoutRequestObjects = this.getTimeoutRequestObjects(
      (body as Record<string, unknown>) ?? {}
    );
    this.log.debug(
      `Will send the following request bodies to /timeouts: ${JSON.stringify(timeoutRequestObjects)}`
    );

    let response!: ProxyResponse;
    let resBody!: HTTPBody;
    for (const timeoutObj of timeoutRequestObjects) {
      [response, resBody] = await this.proxyFunc(url, method, timeoutObj as HTTPBody);

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

  private async proxySetWindow(
    url: string,
    method: string,
    body: HTTPBody
  ): Promise<[ProxyResponse, HTTPBody]> {
    const bodyObj = util.safeJsonParse(body);
    if (_.isPlainObject(bodyObj)) {
      const obj = bodyObj as Record<string, unknown>;
      if (this.downstreamProtocol === W3C && _.has(bodyObj, 'name') && !_.has(bodyObj, 'handle')) {
        this.log.debug(`Copied 'name' value '${obj.name}' to 'handle' as per W3C spec`);
        return await this.proxyFunc(url, method, {...obj, handle: obj.name});
      }
      if (
        this.downstreamProtocol === MJSONWP &&
        _.has(bodyObj, 'handle') &&
        !_.has(bodyObj, 'name')
      ) {
        this.log.debug(`Copied 'handle' value '${obj.handle}' to 'name' as per JSONWP spec`);
        return await this.proxyFunc(url, method, {...obj, name: obj.handle});
      }
    }
    return await this.proxyFunc(url, method, body);
  }

  private async proxySetValue(
    url: string,
    method: string,
    body: HTTPBody
  ): Promise<[ProxyResponse, HTTPBody]> {
    const bodyObj = util.safeJsonParse(body) as Record<string, unknown> | undefined;
    if (_.isPlainObject(bodyObj) && (util.hasValue(bodyObj?.text) || util.hasValue(bodyObj?.value))) {
      const obj = bodyObj;
      let {text, value} = obj;
      if (util.hasValue(text) && !util.hasValue(value)) {
        value = _.isString(text) ? [...text] : _.isArray(text) ? text : [];
        this.log.debug(`Added 'value' property to 'setValue' request body`);
      } else if (!util.hasValue(text) && util.hasValue(value)) {
        text = _.isArray(value) ? value.join('') : _.isString(value) ? value : '';
        this.log.debug(`Added 'text' property to 'setValue' request body`);
      }
      return await this.proxyFunc(url, method, {...obj, text, value});
    }
    return await this.proxyFunc(url, method, body);
  }

  private async proxySetFrame(
    url: string,
    method: string,
    body: HTTPBody
  ): Promise<[ProxyResponse, HTTPBody]> {
    const bodyObj = util.safeJsonParse(body);
    if (_.has(bodyObj, 'id') && _.isPlainObject(bodyObj.id)) {
      return await this.proxyFunc(url, method, {
        ...(bodyObj as object),
        id: duplicateKeys(bodyObj.id as object, MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY),
      });
    }
    return await this.proxyFunc(url, method, body);
  }

  private async proxyPerformActions(
    url: string,
    method: string,
    body: HTTPBody
  ): Promise<[ProxyResponse, HTTPBody]> {
    const bodyObj = util.safeJsonParse(body);
    if (_.isPlainObject(bodyObj)) {
      return await this.proxyFunc(
        url,
        method,
        duplicateKeys(bodyObj as object, MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY)
      );
    }
    return await this.proxyFunc(url, method, body);
  }

  private async proxyReleaseActions(
    url: string,
    method: string
  ): Promise<[ProxyResponse, HTTPBody]> {
    return await this.proxyFunc(url, method);
  }
}
