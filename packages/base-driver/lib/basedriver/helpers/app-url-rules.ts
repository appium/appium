import dns from 'node:dns';
import type {LookupAddress, LookupAllOptions} from 'node:dns';
import net from 'node:net';
import {domainToASCII} from 'node:url';

import {util} from '@appium/support';
import type {AppUrlRulesConfig} from '@appium/types';
import type {AxiosRequestConfig} from 'axios';

import {log as logger} from '../../helpers/logger.js';

/**
 * Key of the process-wide store holding the active rules.
 *
 * A `Symbol.for` key is shared by every copy of this module loaded into the process, so rules
 * configured by the Appium server also apply to drivers which resolve their own copy of
 * `@appium/base-driver` (e.g. from `APPIUM_HOME`), as long as that copy supports app URL rules.
 */
const GLOBAL_STORE_KEY = Symbol.for('@appium/base-driver:app-url-rules');
const DEFAULT_PORTS: Record<string, number> = {http: 80, https: 443};
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
 * @internal Only meant to be called by the Appium server while applying its arguments
 * @throws {TypeError} If any rule is invalid
 */
export function setAppUrlRules(rules?: AppUrlRulesConfig | null): void {
  appUrlRules.configure(rules);
}

/**
 * A compiled `allow` or `deny` list of hostname patterns, IP addresses and subnets
 */
class HostRuleList {
  private readonly _hostnames: RegExp[] = [];
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
    return this._hostnames.some((pattern) => pattern.test(hostname));
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
            throw new Error('prefix must be an integer');
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
    this._hostnames.push(toHostnameRegExp(normalizeHostname(pattern)));
  }

  private _throwInvalid(what: string, pattern: string, cause?: unknown): never {
    throw new TypeError(`The '${this._name}' app URL rule contains an invalid ${what} '${pattern}'`, {cause});
  }
}

/**
 * Validates application URLs, download requests and resolved addresses against a fixed set of rules.
 *
 * A violation is reported to the client with a generic error, while the actual reason is only
 * written to the server log.
 */
class AppUrlRulesValidator {
  private readonly _allow: HostRuleList;
  private readonly _deny: HostRuleList;
  private readonly _httpsOnly: boolean;
  private readonly _allowCredentials: boolean;
  /** The maximum number of redirects to follow, or `undefined` to keep the client's default */
  readonly maxRedirects?: number;

  constructor(rules: AppUrlRulesConfig) {
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
   * @throws {Error} If the URL violates any rule
   */
  assertUrlAllowed(url: URL): void {
    const reject = (reason: string) => this._reject(`The application URL '${redactUrl(url)}'`, reason);
    if (this._httpsOnly && url.protocol !== 'https:') {
      reject('only https: URLs are accepted');
    }
    if (!this._allowCredentials && (url.username || url.password)) {
      reject('URLs containing credentials are not accepted');
    }

    const hostname = normalizeHostname(url.hostname);
    const addressFamily = net.isIP(hostname);
    if (this._deny.matchesHostname(hostname)) {
      reject('the hostname matches a deny rule');
    }
    if (addressFamily && this._deny.matchesAddress(hostname, addressFamily)) {
      reject('the IP address matches a deny rule');
    }
    if (this._allow.isEmpty || this._allow.matchesHostname(hostname)) {
      return;
    }
    if (addressFamily) {
      if (!this._allow.matchesAddress(hostname, addressFamily)) {
        reject('the IP address does not match any allow rule');
      }
    } else if (!this._allow.hasAddressRules) {
      reject('the hostname does not match any allow rule');
    }
  }

  /**
   * Validates the URL of a request (or of a redirect) and makes sure the address rules can actually
   * be enforced for it: if the request is routed through an HTTP proxy, the proxy resolves the
   * destination itself, so dynamically resolved addresses cannot be validated.
   *
   * @throws {Error} If the URL violates any rule or the rules cannot be enforced for it
   */
  assertRequestAllowed(url: URL, proxy: AxiosRequestConfig['proxy']): void {
    this.assertUrlAllowed(url);
    if (!this.hasAddressRules) {
      return;
    }
    const proxyUrl = proxy ? String(proxy.host) : proxy === false ? '' : getEnvProxyUrl(url);
    if (proxyUrl) {
      this._reject(
        `The application URL '${redactUrl(url)}'`,
        `the request would be routed through the HTTP proxy '${redactUrl(proxyUrl)}', ` +
          `so the configured IP address rules cannot be enforced. Either exclude the host from proxying ` +
          `(e.g. via the NO_PROXY environment variable) or only use hostname-based rules`,
      );
    }
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
    const reject = (reason: string) => this._reject(`The application host '${hostname}'`, reason);
    if (addresses.some(({address, family}) => this._deny.matchesAddress(address, family))) {
      reject('a resolved IP address matches a deny rule');
    }
    if (this._allow.isEmpty || this._allow.matchesHostname(hostname)) {
      return addresses;
    }
    const allowed = addresses.filter(({address, family}) => this._allow.matchesAddress(address, family));
    if (!allowed.length) {
      reject('no resolved IP address matches an allow rule');
    }
    return allowed;
  }

  private _reject(subject: string, reason: string): never {
    const message = `${subject} ${NOT_ALLOWED_SUFFIX}`;
    logger.warn(`${message}: ${reason}`);
    throw new Error(message);
  }
}

/**
 * Process-wide rules for remote application URLs (e.g. the `appium:app` capability).
 *
 * The rules are configured once by the Appium server (see {@linkcode setAppUrlRules}) and consumed
 * by the shared app download helper, which only needs to
 * {@linkcode AppUrlRules.assertUrlAllowed | validate a URL} and
 * {@linkcode AppUrlRules.applyToRequest | apply the rules to the download request}.
 */
class AppUrlRules {
  private _compiled?: {source: AppUrlRulesConfig; validator: AppUrlRulesValidator};

  constructor(private readonly _store: AppUrlRulesStore = getGlobalStore()) {}

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
    this._compiled = {source, validator: new AppUrlRulesValidator(source)};
    this._store.rules = source;
  }

  /**
   * Validates a URL against the static rules (scheme, credentials, hostname and literal addresses).
   *
   * @throws {Error} If the URL violates any rule
   */
  assertUrlAllowed(url: URL): void {
    this._validator?.assertUrlAllowed(url);
  }

  /**
   * Returns a copy of the given request options with the rules applied to the actual download:
   * dynamically resolved addresses are validated on every DNS lookup, redirects are limited to
   * `maxRedirects` and each redirect target is validated as well. The options are returned
   * unchanged if no rules are configured.
   *
   * @throws {Error} If the request URL violates any rule or the rules cannot be enforced for it
   */
  applyToRequest(requestOpts: AxiosRequestConfig): AxiosRequestConfig {
    const validator = this._validator;
    if (!validator) {
      return requestOpts;
    }
    validator.assertRequestAllowed(new URL(String(requestOpts.url), requestOpts.baseURL), requestOpts.proxy);
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
      this._compiled = {source, validator: new AppUrlRulesValidator(source)};
    }
    return this._compiled.validator;
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

/**
 * Returns the proxy URL the HTTP client would route a request to the given URL through,
 * according to the `<scheme>_proxy`, `all_proxy` and `no_proxy` environment variables
 * (mirroring the `proxy-from-env` logic used by axios), or an empty string if none applies.
 */
function getEnvProxyUrl(url: URL): string {
  const proto = url.protocol.replace(/:$/, '');
  const port = parseInt(url.port, 10) || DEFAULT_PORTS[proto] || 0;
  if (!shouldProxy(url.hostname, port)) {
    return '';
  }
  const proxy =
    getEnv(`npm_config_${proto}_proxy`) ||
    getEnv(`${proto}_proxy`) ||
    getEnv('npm_config_proxy') ||
    getEnv('all_proxy');
  return proxy && !proxy.includes('://') ? `${proto}://${proxy}` : proxy;
}

/**
 * @param hostname - The hostname of the URL (IPv6 addresses are wrapped in brackets)
 * @param port - The effective port of the URL
 */
function shouldProxy(hostname: string, port: number): boolean {
  const noProxy = (getEnv('npm_config_no_proxy') || getEnv('no_proxy')).toLowerCase();
  if (!noProxy) {
    return true;
  }
  if (noProxy === '*') {
    return false;
  }
  return noProxy.split(/[,\s]/).every((entry) => {
    if (!entry) {
      return true;
    }
    const withPort = /^(.+):(\d+)$/.exec(entry);
    let entryHostname = withPort ? withPort[1] : entry;
    const entryPort = withPort ? parseInt(withPort[2], 10) : 0;
    if (entryPort && entryPort !== port) {
      return true;
    }
    if (!/^[.*]/.test(entryHostname)) {
      return hostname !== entryHostname;
    }
    if (entryHostname.startsWith('*')) {
      entryHostname = entryHostname.slice(1);
    }
    return !hostname.endsWith(entryHostname);
  });
}

function getEnv(key: string): string {
  return process.env[key.toLowerCase()] || process.env[key.toUpperCase()] || '';
}

/**
 * Converts a hostname pattern to a regular expression, where `*` matches any sequence of
 * characters (including dots) and `?` matches any single character.
 */
function toHostnameRegExp(pattern: string): RegExp {
  const source = pattern
    .split(/([*?])/)
    .map((part) => (part === '*' ? '.*' : part === '?' ? '.' : util.escapeRegExp(part)))
    .join('');
  return new RegExp(`^${source}$`);
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
  if (!normalized.includes('*') && !normalized.includes('?')) {
    return domainToASCII(normalized);
  }
  return normalized
    .split('.')
    .map((label) => (label.includes('*') || label.includes('?') ? label : domainToASCII(label)))
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
