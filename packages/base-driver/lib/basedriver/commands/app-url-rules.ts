import type {LookupAddress, LookupAllOptions, LookupOptions} from 'node:dns';
import dns from 'node:dns/promises';
import net from 'node:net';
import {domainToASCII} from 'node:url';

import type {AppUrlRulesConfig, Constraints} from '@appium/types';
import picomatch from 'picomatch';

import type {DriverCore} from '../core.js';

interface CompiledRuleList {
  hostnames: Array<(hostname: string) => boolean>;
  addresses: net.BlockList;
  addressCount: number;
}

/** @internal */
export interface CompiledAppUrlRules {
  allow: CompiledRuleList;
  deny: CompiledRuleList;
  httpsOnly: boolean;
  allowCredentials: boolean;
  maxRedirects?: number;
}

let currentRules: CompiledAppUrlRules | undefined;

/** @internal */
export function compileAppUrlRules(rules: AppUrlRulesConfig): CompiledAppUrlRules {
  const {allow, deny, httpsOnly, allowCredentials, maxRedirects} = rules;
  const compiled: CompiledAppUrlRules = {
    allow: compileRuleList('allow', allow),
    deny: compileRuleList('deny', deny),
    httpsOnly: httpsOnly ?? false,
    allowCredentials: allowCredentials ?? true,
  };
  if (maxRedirects != null) {
    compiled.maxRedirects = maxRedirects;
  }
  return compiled;
}

/** Configures process-wide app URL rules using the invoking driver's logger. */
export function configureAppUrlRules<C extends Constraints>(
  this: DriverCore<C>,
  rules?: AppUrlRulesConfig | null,
): void {
  currentRules = !rules || Object.keys(rules).length === 0 ? undefined : compileAppUrlRules(rules);
  if (currentRules) {
    this.log.info(`Remote application URLs are restricted by: ${JSON.stringify(rules)}`);
  }
}

/** @internal */
export function getAppUrlRules(): CompiledAppUrlRules | undefined {
  return currentRules;
}

/** @internal */
export function assertAppUrlAllowed(url: URL, rules: CompiledAppUrlRules | undefined = currentRules): void {
  if (!rules) {
    return;
  }
  const reject = createReject(url);
  if (rules.httpsOnly && url.protocol !== 'https:') {
    reject(`only https: URLs are accepted`);
  }
  if (!rules.allowCredentials && (url.username || url.password)) {
    reject(`URLs containing credentials are not accepted`);
  }

  const hostname = normalizeHostname(url.hostname);
  const addressFamily = net.isIP(hostname);
  if (matchesHostname(rules.deny, hostname)) {
    reject(`the hostname matches a deny rule`);
  }
  if (addressFamily && matchesAddress(rules.deny, hostname, addressFamily)) {
    reject(`the IP address matches a deny rule`);
  }
  if (!hasRules(rules.allow)) {
    return;
  }
  if (matchesHostname(rules.allow, hostname)) {
    return;
  }
  if (addressFamily) {
    if (!matchesAddress(rules.allow, hostname, addressFamily)) {
      reject(`the IP address does not match any allow rule`);
    }
    return;
  }
  if (!rules.allow.addressCount) {
    reject(`the hostname does not match any allow rule`);
  }
}

/** @internal Creates a DNS lookup which applies address rules to every fresh resolution. */
export function createAppUrlLookup(rules: CompiledAppUrlRules) {
  return async (hostname: string, options: LookupOptions = {}): Promise<LookupAddress[]> => {
    const normalizedHostname = normalizeHostname(hostname);
    const addresses = await dns.lookup(normalizedHostname, {...options, all: true} as LookupAllOptions);
    const reject = createReject(new URL(`http://${formatHostname(normalizedHostname)}`));

    if (addresses.some(({address, family}) => matchesAddress(rules.deny, address, family))) {
      reject(`a resolved IP address matches a deny rule`);
    }
    if (!hasRules(rules.allow) || matchesHostname(rules.allow, normalizedHostname)) {
      return addresses;
    }
    const allowed = addresses.filter(({address, family}) => matchesAddress(rules.allow, address, family));
    if (!allowed.length) {
      reject(`no resolved IP address matches an allow rule`);
    }
    return allowed;
  };
}

function compileRuleList(name: string, patterns: string[] = []): CompiledRuleList {
  const result: CompiledRuleList = {hostnames: [], addresses: new net.BlockList(), addressCount: 0};
  for (const pattern of patterns) {
    const parts = pattern.split('/');
    const [address, prefix] = parts;
    const family = net.isIP(address);
    if (parts.length > 2) {
      throw new TypeError(`The '${name}' app URL rule contains an invalid IP address or hostname '${pattern}'`);
    }
    if (family) {
      try {
        if (prefix === undefined) {
          result.addresses.addAddress(address, family === 4 ? 'ipv4' : 'ipv6');
        } else {
          if (!/^\d+$/.test(prefix)) {
            throw new Error('prefix must be an integer');
          }
          result.addresses.addSubnet(address, Number(prefix), family === 4 ? 'ipv4' : 'ipv6');
        }
      } catch (e) {
        throw new TypeError(`The '${name}' app URL rule contains an invalid IP address or subnet '${pattern}'`, {
          cause: e,
        });
      }
      result.addressCount++;
      continue;
    }
    if (prefix !== undefined || !pattern) {
      throw new TypeError(`The '${name}' app URL rule contains an invalid IP address or hostname '${pattern}'`);
    }
    result.hostnames.push(
      picomatch(normalizeHostname(pattern), {
        literalBrackets: true,
        nobrace: true,
        nocase: true,
        noext: true,
        nonegate: true,
      }),
    );
  }
  return result;
}

function hasRules(rules: CompiledRuleList): boolean {
  return Boolean(rules.hostnames.length || rules.addressCount);
}

function matchesHostname(rules: CompiledRuleList, hostname: string): boolean {
  return rules.hostnames.some((matches) => matches(hostname));
}

function matchesAddress(rules: CompiledRuleList, address: string, family: number): boolean {
  return rules.addresses.check(address, family === 4 ? 'ipv4' : 'ipv6');
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

function createReject(url: URL): (reason: string) => never {
  return (reason: string): never => {
    const redactedUrl = new URL(url);
    redactedUrl.username = '';
    redactedUrl.password = '';
    throw new Error(`The application URL '${redactedUrl.href}' is not allowed by the server configuration: ${reason}`);
  };
}
