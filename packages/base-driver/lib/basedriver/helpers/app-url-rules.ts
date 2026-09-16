import dns from 'node:dns';
import type {LookupAddress, LookupAllOptions} from 'node:dns';
import net from 'node:net';
import {domainToASCII} from 'node:url';

import type {AppUrlRulesConfig} from '@appium/types';
import type {AxiosRequestConfig} from 'axios';
import picomatch from 'picomatch';

import {log as logger} from '../../helpers/logger.js';
import {EnvProxyResolver} from './env-proxy.js';

/**
 * Key of the process-wide store holding the active rules.
 *
 * A `Symbol.for` key is shared by every copy of this module loaded into the process, so rules
 * configured by the Appium server also apply to drivers which resolve their own copy of
 * `@appium/base-driver` (e.g. from `APPIUM_HOME`), as long as that copy supports app URL rules.
 *
 * The key must stay the same across major versions of this package, so older copies keep
 * enforcing the rules. The store only holds the raw configuration, which every copy validates
 * itself: a copy that does not understand a rule fails closed instead of ignoring it.
 */
const GLOBAL_STORE_KEY = Symbol.for('@appium/base-driver:app-url-rules');
const KNOWN_RULES: ReadonlySet<keyof AppUrlRulesConfig> = new Set([
  'allow',
  'deny',
  'httpsOnly',
  'allowCredentials',
  'maxRedirects',
]);
/** Characters which make a hostname pattern a glob (see https://github.com/micromatch/picomatch) */
const GLOB_CHARS = /[*?[\]{}()!+@|\\]/;
const NOT_ALLOWED_SUFFIX = 'is not allowed by the server configuration';

interface AppUrlRulesStore {
  rules?: AppUrlRulesConfig;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address?: string | LookupAddress[], family?: number) => void;
type LookupFunction = (hostname: string, options: LookupAllOptions, callback: LookupCallback) => void;

/**
 * Replaces the process-wide rules remote application URLs must satisfy before they are
 * downloaded by {@linkcode configureApp}. Empty or absent rules lift all restrictions.
 *
 * Only meant to be called by the Appium server while applying its arguments. It is not tagged
 * `@internal`, since that would strip it from the published typings the server compiles against.
 *
 * @throws {TypeError} If any rule is invalid
 */
export function setAppUrlRules(rules?: AppUrlRulesConfig | null): void {
  appUrlRules.configure(rules);
}

/**
 * A compiled `allow` or `deny` list of hostname patterns, IP addresses and subnets
 */
class HostRuleList {
  private readonly _hostnames: picomatch.Matcher[] = [];
  private readonly _addresses = new net.BlockList();
  private _addressCount = 0;

  constructor(
    private readonly _name: string,
    patterns: string[] = [],
  ) {
    for (const pattern of patterns) {
      this._add(pattern);
    }
  }

  /** Whether the list contains no rules at all */
  get isEmpty(): boolean {
    return !this._hostnames.length && !this.hasAddressRules;
  }

  /** Whether the list contains IP address or subnet rules */
  get hasAddressRules(): boolean {
    return this._addressCount > 0;
  }

  /**
   * @param hostname - A normalized hostname (see {@linkcode normalizeHostname})
   */
  matchesHostname(hostname: string): boolean {
    return this._hostnames.some((isMatch) => isMatch(hostname));
  }

  matchesAddress(address: string, family: number): boolean {
    return this._addresses.check(address, toFamilyName(family));
  }

  private _add(pattern: string): void {
    const parts = pattern.split('/');
    const [address, prefix] = parts;
    const family = net.isIP(address);
    if (parts.length > 2) {
      this._throwInvalid('IP address or hostname', pattern);
    }
    if (family) {
      try {
        if (prefix === undefined) {
          this._addresses.addAddress(address, toFamilyName(family));
        } else {
          if (!/^\d+$/.test(prefix)) {
            throw new Error(`The subnet prefix '${prefix}' must be a non-negative integer`);
          }
          this._addresses.addSubnet(address, Number(prefix), toFamilyName(family));
        }
      } catch (e) {
        this._throwInvalid('IP address or subnet', pattern, e);
      }
      this._addressCount++;
      return;
    }
    if (prefix !== undefined || !pattern) {
      this._throwInvalid('IP address or hostname', pattern);
    }
    try {
      this._hostnames.push(picomatch(normalizeHostname(pattern), {dot: true}));
    } catch (e) {
      this._throwInvalid('hostname pattern', pattern, e);
    }
  }

  private _throwInvalid(what: string, pattern: string, cause?: unknown): never {
    throw new TypeError(`The '${this._name}' app URL rule contains an invalid ${what} '${pattern}'`, {cause});
  }
}

/**
 * Validates application URLs, download requests and resolved addresses against a fixed set of rules.
 *
 * A violation is reported with a generic error which does not reveal the violated rule
 * (see {@linkcode AppUrlRulesValidator._reject}).
 */
class AppUrlRulesValidator {
  private readonly _allow: HostRuleList;
  private readonly _deny: HostRuleList;
  private readonly _httpsOnly: boolean;
  private readonly _allowCredentials: boolean;
  /** The maximum number of redirects to follow, or `undefined` to keep the client's default */
  readonly maxRedirects?: number;

  constructor(
    rules: AppUrlRulesConfig,
    private readonly _envProxy: EnvProxyResolver,
  ) {
    for (const rule of Object.keys(rules)) {
      if (!KNOWN_RULES.has(rule as keyof AppUrlRulesConfig)) {
        throw new TypeError(`The app URL rule '${rule}' is not supported`);
      }
    }
    this._allow = new HostRuleList('allow', rules.allow);
    this._deny = new HostRuleList('deny', rules.deny);
    this._httpsOnly = rules.httpsOnly ?? false;
    this._allowCredentials = rules.allowCredentials ?? true;
    if (rules.maxRedirects != null) {
      this.maxRedirects = rules.maxRedirects;
    }
  }

  /**
   * Whether any rule applies to (dynamically resolved) IP addresses, so every DNS lookup must
   * be validated as well
   */
  get hasAddressRules(): boolean {
    return this._allow.hasAddressRules || this._deny.hasAddressRules;
  }

  /**
   * Validates a URL against the static rules (scheme, credentials, hostname and literal addresses).
   *
   * @returns The given URL, for chaining
   * @throws {Error} If the URL violates any rule
   */
  assertUrlAllowed(url: URL): URL {
    const reject = () => this._reject(`The application URL '${redactUrl(url)}'`);
    if (this._httpsOnly && url.protocol !== 'https:') {
      reject();
    }
    if (!this._allowCredentials && (url.username || url.password)) {
      reject();
    }

    const hostname = normalizeHostname(url.hostname);
    const addressFamily = net.isIP(hostname);
    // a deny rule always wins over an allow rule
    if (this._deny.matchesHostname(hostname)) {
      reject();
    }
    if (addressFamily && this._deny.matchesAddress(hostname, addressFamily)) {
      reject();
    }
    if (this._allow.isEmpty || this._allow.matchesHostname(hostname)) {
      return url;
    }
    if (addressFamily) {
      if (!this._allow.matchesAddress(hostname, addressFamily)) {
        reject();
      }
    } else if (!this._allow.hasAddressRules) {
      // a hostname not matching any allow rule may still resolve to an allowed address
      reject();
    }
    return url;
  }

  /**
   * Validates the URL of a request (or of a redirect) and makes sure the address rules can actually
   * be enforced for it: if the request is routed through an HTTP proxy, the proxy resolves the
   * destination itself, so dynamically resolved addresses cannot be validated.
   *
   * @returns The given URL, for chaining
   * @throws {Error} If the URL violates any rule or the rules cannot be enforced for it
   */
  assertRequestAllowed(url: URL, proxy: AxiosRequestConfig['proxy']): URL {
    this.assertUrlAllowed(url);
    if (!this.hasAddressRules) {
      return url;
    }
    const isProxied = proxy === false ? false : Boolean(proxy || this._envProxy.getProxyForUrl(url));
    if (isProxied) {
      // the proxy would resolve the destination itself, so the address rules cannot be enforced
      this._reject(`The application URL '${redactUrl(url)}'`);
    }
    return url;
  }

  /**
   * Creates a `dns.lookup`-compatible function which applies the address rules to every fresh
   * resolution. Node's `http.request` (and thus axios) expects the callback-based contract.
   */
  createLookup(): LookupFunction {
    return (hostname, options, callback) => {
      const normalizedHostname = normalizeHostname(hostname);
      dns.lookup(normalizedHostname, {...options, all: true}, (err, addresses) => {
        if (err) {
          return callback(err);
        }
        let allowed: LookupAddress[];
        try {
          allowed = this._filterResolvedAddresses(normalizedHostname, addresses);
        } catch (e) {
          return callback(e as Error);
        }
        if (options.all) {
          callback(null, allowed);
        } else if (allowed.length) {
          callback(null, allowed[0].address, allowed[0].family);
        } else {
          callback(Object.assign(new Error(`getaddrinfo ENOTFOUND ${normalizedHostname}`), {code: 'ENOTFOUND'}));
        }
      });
    };
  }

  private _filterResolvedAddresses(hostname: string, addresses: LookupAddress[]): LookupAddress[] {
    const reject = () => this._reject(`The application host '${hostname}'`);
    if (addresses.some(({address, family}) => this._deny.matchesAddress(address, family))) {
      reject();
    }
    if (this._allow.isEmpty || this._allow.matchesHostname(hostname)) {
      return addresses;
    }
    const allowed = addresses.filter(({address, family}) => this._allow.matchesAddress(address, family));
    if (!allowed.length) {
      reject();
    }
    return allowed;
  }

  /**
   * Reports a violation with a generic error. The violated rule is deliberately not included in
   * the error nor written to the server log: server logs are usually handed over to clients, and
   * must not reveal anything about the configured rules.
   */
  private _reject(subject: string): never {
    const message = `${subject} ${NOT_ALLOWED_SUFFIX}`;
    logger.warn(message);
    throw new Error(message);
  }
}

/**
 * Process-wide rules for remote application URLs (e.g. the `appium:app` capability).
 *
 * The rules are configured once by the Appium server (see {@linkcode setAppUrlRules}) and consumed
 * by the shared app download helper, which
 * {@linkcode AppUrlRules.assertUrlAllowed | validates the URL},
 * {@linkcode AppUrlRules.assertRequestAllowed | validates the download request} and
 * {@linkcode AppUrlRules.applyToRequest | applies the rules to the download request}.
 */
class AppUrlRules {
  private _compiled?: {source: AppUrlRulesConfig; validator: AppUrlRulesValidator};

  constructor(
    private readonly _store: AppUrlRulesStore = getGlobalStore(),
    private readonly _envProxy: EnvProxyResolver = new EnvProxyResolver(),
  ) {}

  /**
   * The currently configured rules, or `undefined` if remote application URLs are not restricted
   */
  get config(): Readonly<AppUrlRulesConfig> | undefined {
    return this._store.rules;
  }

  /**
   * Replaces the process-wide rules. Empty or absent rules lift all restrictions.
   *
   * @throws {TypeError} If any rule is invalid
   */
  configure(rules?: AppUrlRulesConfig | null): void {
    if (!rules || Object.keys(rules).length === 0) {
      delete this._store.rules;
      this._compiled = undefined;
      return;
    }
    // keep a private copy, so later mutations by the caller cannot bypass the compiled rules
    const source: AppUrlRulesConfig = structuredClone(rules);
    this._compiled = {source, validator: this._compile(source)};
    this._store.rules = source;
  }

  /**
   * Validates a URL against the static rules (scheme, credentials, hostname and literal addresses).
   *
   * @returns The given URL, for chaining
   * @throws {Error} If the URL violates any rule
   */
  assertUrlAllowed(url: URL): URL {
    this._validator?.assertUrlAllowed(url);
    return url;
  }

  /**
   * Validates the URL of a download request against the static rules and makes sure the rules
   * can actually be enforced for the request (see {@linkcode applyToRequest}): if the request is
   * routed through an HTTP proxy, the proxy resolves the destination itself, so rules containing
   * IP addresses cannot be applied to dynamically resolved addresses.
   *
   * @returns The given request options, for chaining
   * @throws {Error} If the request URL violates any rule or the rules cannot be enforced for it
   */
  assertRequestAllowed(requestOpts: AxiosRequestConfig): AxiosRequestConfig {
    this._validator?.assertRequestAllowed(toRequestUrl(requestOpts), requestOpts.proxy);
    return requestOpts;
  }

  /**
   * Returns a copy of the given request options with the rules applied to the actual download:
   * dynamically resolved addresses are validated on every DNS lookup, redirects are limited to
   * `maxRedirects` and each redirect target is validated as well. The options are returned
   * unchanged if no rules are configured.
   *
   * This does not validate the request itself, see {@linkcode assertRequestAllowed}.
   */
  applyToRequest(requestOpts: AxiosRequestConfig): AxiosRequestConfig {
    const validator = this._validator;
    if (!validator) {
      return requestOpts;
    }
    const result: AxiosRequestConfig = {...requestOpts};
    if (validator.hasAddressRules) {
      result.lookup = validator.createLookup() as AxiosRequestConfig['lookup'];
    }
    if (validator.maxRedirects !== undefined) {
      result.maxRedirects = validator.maxRedirects;
    }
    // Make sure redirects cannot be used to escape the configured rules
    result.beforeRedirect = (redirectOpts, ...details) => {
      validator.assertRequestAllowed(toRedirectUrl(redirectOpts), requestOpts.proxy);
      requestOpts.beforeRedirect?.(redirectOpts, ...details);
    };
    return result;
  }

  /**
   * The validator for the currently configured rules, or `undefined` if there are none
   */
  private get _validator(): AppUrlRulesValidator | undefined {
    const source = this._store.rules;
    if (!source) {
      this._compiled = undefined;
      return;
    }
    // another copy of this module may have replaced the rules
    if (this._compiled?.source !== source) {
      this._compiled = {source, validator: this._compile(source)};
    }
    return this._compiled.validator;
  }

  private _compile(source: AppUrlRulesConfig): AppUrlRulesValidator {
    return new AppUrlRulesValidator(source, this._envProxy);
  }
}

/**
 * The process-wide app URL rules singleton, only meant to be used by the app download helper
 *
 * @internal
 */
export const appUrlRules = new AppUrlRules();

function getGlobalStore(): AppUrlRulesStore {
  const globalStores = globalThis as typeof globalThis & {[GLOBAL_STORE_KEY]?: AppUrlRulesStore};
  globalStores[GLOBAL_STORE_KEY] ??= {};
  return globalStores[GLOBAL_STORE_KEY];
}

function toRequestUrl(requestOpts: AxiosRequestConfig): URL {
  return new URL(String(requestOpts.url), requestOpts.baseURL);
}

/**
 * Builds the target URL of a redirect from the options `follow-redirects` passes to `beforeRedirect`.
 * Fails closed: a redirect whose target cannot be determined is rejected.
 */
function toRedirectUrl(redirectOpts: Record<string, any>): URL {
  const {href, protocol, hostname, host, port, path} = redirectOpts as Record<string, string | undefined>;
  try {
    if (href) {
      return new URL(href);
    }
    const authority = hostname ? `${formatHostname(hostname)}${port ? `:${port}` : ''}` : host;
    return new URL(`${protocol}//${authority}${path ?? '/'}`);
  } catch (e) {
    throw new Error(`The redirect target of the application URL cannot be determined, so it ${NOT_ALLOWED_SUFFIX}`, {
      cause: e,
    });
  }
}

function toFamilyName(family: number): 'ipv4' | 'ipv6' {
  return family === 4 ? 'ipv4' : 'ipv6';
}

function normalizeHostname(hostname: string): string {
  const normalized = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  if (net.isIP(normalized)) {
    return normalized;
  }
  if (!GLOB_CHARS.test(normalized)) {
    return domainToASCII(normalized);
  }
  // only the literal labels of a pattern can be converted to punycode
  return normalized
    .split('.')
    .map((label) => (GLOB_CHARS.test(label) ? label : domainToASCII(label)))
    .join('.');
}

function formatHostname(hostname: string): string {
  return net.isIPv6(hostname) ? `[${hostname}]` : hostname;
}

function redactUrl(url: URL | string): string {
  try {
    const redactedUrl = new URL(url);
    redactedUrl.username = '';
    redactedUrl.password = '';
    return redactedUrl.href;
  } catch {
    return String(url);
  }
}
