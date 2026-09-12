import nodeFs from 'node:fs';
import path from 'node:path';

import {node} from '@appium/support';
import type {PackageJson} from 'type-fest';

// for compat with running tests transpiled and in-place
export const BASEDRIVER_VER = readBaseDriverVersion();

function readBaseDriverVersion(): string {
  const pkgRoot = node.getModuleRootSync('@appium/base-driver', import.meta.filename);
  if (!pkgRoot) {
    throw new Error('Cannot find the @appium/base-driver package root');
  }
  const pkg = JSON.parse(nodeFs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8')) as PackageJson;
  if (typeof pkg.version !== 'string') {
    throw new Error('Invalid `package.json` for @appium/base-driver');
  }
  return pkg.version;
}
