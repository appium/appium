import {util} from '@appium/support';
import type {Driver, DriverMethodDef, HTTPMethod, MethodMap} from '@appium/types';
import {LRUCache} from 'lru-cache';
import {match} from 'path-to-regexp';

import {DEFAULT_BASE_PATH} from '../../constants';
import {APPIUM_ROUTES} from './appium';
import {JSONWP_ROUTES} from './jsonwp';
import {MJSONWP_ROUTES} from './mjsonwp';
import {OTHER_PROTOCOLS_ROUTES} from './other';
import {W3C_ROUTES} from './w3c';

const COMMAND_NAMES_CACHE = new LRUCache<string, string>({
  max: 1024,
});

/**
 * Mapping of HTTP methods to particular driver commands, and any parameters
 * that are expected in a request. Parameters can be `required` or `optional`.
 *
 * Assembled from the grouped route definitions in this directory, one per
 * protocol/spec, so each group can be reviewed and maintained independently.
 */
export const METHOD_MAP = {
  ...W3C_ROUTES,
  ...JSONWP_ROUTES,
  ...MJSONWP_ROUTES,
  ...APPIUM_ROUTES,
  ...OTHER_PROTOCOLS_ROUTES,
} as const satisfies MethodMap<Driver>;

// driver command names
export const ALL_COMMANDS = Object.values(METHOD_MAP)
  .flatMap((methods) => Object.values(methods) as Array<{command?: string}>)
  .flatMap((m) => (m.command ? [m.command] : []));

/**
 * Resolve a WebDriver URL path and HTTP method to a driver command name from {@link METHOD_MAP}.
 * @param endpoint - Request URL or path (may include base path)
 * @param method - HTTP method (used when one path maps to multiple commands)
 * @param basePath - Optional base path prefix to strip before matching
 */
export function routeToCommandName(endpoint: string, method?: HTTPMethod, basePath?: string): string | undefined {
  const resolvedBasePath = basePath ?? DEFAULT_BASE_PATH;
  let normalizedEndpoint = resolvedBasePath
    ? endpoint.replace(new RegExp(`^${util.escapeRegExp(resolvedBasePath)}`), '')
    : endpoint;
  normalizedEndpoint = `${normalizedEndpoint.startsWith('/') ? '' : '/'}${normalizedEndpoint}`;
  let normalizedPathname: string;
  try {
    // we could use any prefix there as we anyway need to only extract the pathname
    normalizedPathname = new URL(`https://appium.io${normalizedEndpoint}`).pathname;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`'${endpoint}' cannot be translated to a command name: ${msg}`, {cause: err});
  }

  const normalizedMethod = (method ?? '').toUpperCase();
  const cacheKey = toCommandNameCacheKey(normalizedPathname, normalizedMethod);
  const cached = COMMAND_NAMES_CACHE.get(cacheKey);
  if (cached !== undefined) {
    return cached || undefined;
  }

  const possiblePathnames: string[] = [];
  if (!normalizedPathname.startsWith('/session/')) {
    possiblePathnames.push(`/session/any-session-id${normalizedPathname}`);
  }
  possiblePathnames.push(normalizedPathname);
  for (const [routePath, routeSpec] of Object.entries(METHOD_MAP)) {
    const routeMatcher = match(routePath);
    if (possiblePathnames.some((pp) => routeMatcher(pp))) {
      const spec = routeSpec as Record<string, DriverMethodDef<Driver>>;
      const commandForAnyMethod = () => Object.keys(spec).map((key) => spec[key]?.command)[0];
      const commandName = normalizedMethod ? spec[normalizedMethod]?.command : commandForAnyMethod();
      if (commandName) {
        COMMAND_NAMES_CACHE.set(cacheKey, commandName);
        return commandName;
      }
    }
  }
  // storing an empty string means we did not find any match for this set of arguments
  // and we want to cache this result
  COMMAND_NAMES_CACHE.set(cacheKey, '');
}

function toCommandNameCacheKey(endpoint: string, method?: string): string {
  return `${endpoint}:${method ?? ''}`;
}

// driver commands that do not require a session to already exist
export const NO_SESSION_ID_COMMANDS = ['createSession', 'getStatus', 'getAppiumSessions'];
