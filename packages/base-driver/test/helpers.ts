import nodePath from 'node:path';

import {node, util} from '@appium/support';

const BASE_DRIVER_MODULE_NAME = '@appium/base-driver';

/**
 * Resolves the absolute root of the `@appium/base-driver` package. Memoized because it walks up
 * the directory tree checking `package.json` files on every call, and the result is always the
 * same for the lifetime of a test run.
 */
export const getModuleRootPath = util.memoize((moduleName: string, filePath: string): string => {
  const root = node.getModuleRootSync(moduleName, filePath);
  if (!root) {
    throw new Error(`Could not resolve the root of the '${moduleName}' module from '${filePath}'`);
  }
  return root;
});

/**
 * Snapshot tests run against the compiled `build/test/**\/*.js`; resolve to the checked-in
 * `.snapshot` file next to the TS source instead, so it's reviewable alongside the change that
 * produced it.
 */
export function resolveSourceSnapshotPath(testFilePath: string | undefined): string {
  if (!testFilePath) {
    throw new Error('Cannot resolve a snapshot path without a test file path');
  }
  const root = getModuleRootPath(BASE_DRIVER_MODULE_NAME, testFilePath);
  const relativePath = nodePath.relative(nodePath.join(root, 'build', 'test'), testFilePath);
  return `${nodePath.join(root, 'test', relativePath).replace(/\.js$/, '.ts')}.snapshot`;
}

/**
 * Build Appium server URLs for tests.
 *
 * Call with `(address, port)` to get `(session, pathname) => url`, or pass all four
 * arguments at once. Use `''` when session or pathname is omitted.
 */
export function createAppiumURL(address: string, port: string | number): (session: string, pathname: string) => string;
export function createAppiumURL(address: string, port: string | number, session: string, pathname: string): string;
export function createAppiumURL(
  address: string,
  port: string | number,
  session?: string,
  pathname?: string,
): string | ((session: string, pathname: string) => string) {
  const urlFor = (sess: string, path: string) => buildAppiumURL(address, port, sess, path);
  if (arguments.length === 2) {
    return urlFor;
  }
  return urlFor(session!, pathname!);
}

function buildAppiumURL(address: string, port: string | number, session: string, pathname: string): string {
  let base = address;
  if (!/^https?:\/\//.test(base)) {
    base = `http://${base}`;
  }
  let path = session ? `session/${session}` : '';
  if (pathname) {
    path = `${path}/${pathname}`;
  }
  return new URL(path, `${base}:${port}`).href;
}
