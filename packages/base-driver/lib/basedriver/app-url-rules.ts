import {util} from '@appium/support';
import type {AppUrlRulesConfig} from '@appium/types';

import {log as logger} from './logger.js';

/**
 * Compiled representation of {@link AppUrlRulesConfig}, ready to be applied to URLs.
 */
export interface CompiledAppUrlRules {
  allow: RegExp[];
  deny: RegExp[];
  httpsOnly: boolean;
  allowCredentials: boolean;
  maxRedirects?: number;
}

let currentRules: CompiledAppUrlRules | undefined;

/**
 * Compiles the given rules so they can be applied to remote application URLs.
 *
 * @param rules - Raw rules, as provided via the `--app-url-rules` server argument.
 * @returns Compiled rules.
 * @throws {TypeError} If any rule has an invalid value (e.g. a malformed regular expression).
 */
export function compileAppUrlRules(rules: AppUrlRulesConfig): CompiledAppUrlRules {
  if (!util.isPlainObject(rules)) {
    throw new TypeError(`App URL rules must be a plain object. Got ${JSON.stringify(rules)} instead`);
  }
  const {allow, deny, httpsOnly, allowCredentials, maxRedirects} = rules;
  const compiled: CompiledAppUrlRules = {
    allow: toRegExps('allow', allow),
    deny: toRegExps('deny', deny),
    httpsOnly: toBoolean('httpsOnly', httpsOnly, false),
    allowCredentials: toBoolean('allowCredentials', allowCredentials, true),
  };
  if (maxRedirects !== undefined && maxRedirects !== null) {
    if (typeof maxRedirects !== 'number' || !Number.isInteger(maxRedirects) || maxRedirects < 0) {
      throw new TypeError(
        `The 'maxRedirects' app URL rule must be a non-negative integer. Got ${JSON.stringify(maxRedirects)} instead`,
      );
    }
    compiled.maxRedirects = maxRedirects;
  }
  return compiled;
}

/**
 * Sets the rules that remote application URLs must satisfy before they are downloaded.
 * The rules apply to all subsequent {@link configureApp} calls in the current process.
 *
 * @param rules - Raw rules, or `undefined` to remove any previously set rules.
 * @throws {TypeError} If any rule has an invalid value.
 */
export function setAppUrlRules(rules?: AppUrlRulesConfig | null): void {
  if (util.isEmpty(rules)) {
    currentRules = undefined;
    return;
  }
  currentRules = compileAppUrlRules(rules as AppUrlRulesConfig);
  logger.info(`Remote application URLs are restricted by the following rules: ${describeRules(currentRules)}`);
}

/**
 * @returns The currently active app URL rules, if any.
 */
export function getAppUrlRules(): CompiledAppUrlRules | undefined {
  return currentRules;
}

/**
 * Verifies the given URL against the given rules.
 *
 * @param url - The URL to verify.
 * @param rules - The rules to apply. Defaults to the currently active ones.
 * @throws {Error} If the URL violates any of the rules.
 */
export function assertAppUrlAllowed(url: URL, rules: CompiledAppUrlRules | undefined = currentRules): void {
  if (!rules) {
    return;
  }
  const {href} = url;
  const reject = (reason: string): never => {
    // do not leak credentials into logs/error messages
    const redactedUrl = new URL(href);
    redactedUrl.username = '';
    redactedUrl.password = '';
    throw new Error(`The application URL '${redactedUrl.href}' is not allowed by the server configuration: ${reason}`);
  };

  if (rules.httpsOnly && url.protocol !== 'https:') {
    reject(`only https: URLs are accepted`);
  }
  if (!rules.allowCredentials && (url.username || url.password)) {
    reject(`URLs containing credentials are not accepted`);
  }
  if (rules.deny.some((re) => re.test(href))) {
    reject(`the URL matches a deny rule`);
  }
  if (rules.allow.length > 0 && !rules.allow.some((re) => re.test(href))) {
    reject(`the URL does not match any allow rule`);
  }
}

function toRegExps(name: string, patterns: unknown): RegExp[] {
  if (patterns === undefined || patterns === null) {
    return [];
  }
  if (!Array.isArray(patterns) || patterns.some((p) => typeof p !== 'string')) {
    throw new TypeError(
      `The '${name}' app URL rule must be an array of strings. Got ${JSON.stringify(patterns)} instead`,
    );
  }
  return (patterns as string[]).map((pattern) => {
    try {
      return new RegExp(pattern);
    } catch (e) {
      throw new TypeError(
        `The '${name}' app URL rule contains an invalid regular expression '${pattern}': ${(e as Error).message}`,
        {cause: e},
      );
    }
  });
}

function toBoolean(name: string, value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value !== 'boolean') {
    throw new TypeError(`The '${name}' app URL rule must be a boolean. Got ${JSON.stringify(value)} instead`);
  }
  return value;
}

function describeRules(rules: CompiledAppUrlRules): string {
  return JSON.stringify({
    allow: rules.allow.map(String),
    deny: rules.deny.map(String),
    httpsOnly: rules.httpsOnly,
    allowCredentials: rules.allowCredentials,
    ...(rules.maxRedirects === undefined ? {} : {maxRedirects: rules.maxRedirects}),
  });
}
