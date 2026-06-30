import nodeFs from 'node:fs';
import path from 'node:path';
import type { PackageJson } from 'type-fest';

type AppiumPackageJson = PackageJson & {
  name: string;
  version: string;
};

function readPackageJsonSync(): { pkgRoot: string; pkg: AppiumPackageJson; } {
  let current = path.resolve(__dirname);
  const root = path.parse(current).root;
  let pkgRoot: string;
  while (true) {
    if (nodeFs.existsSync(path.join(current, 'package.json'))) {
      pkgRoot = current;
      break;
    }
    if (current === root) {
      throw new Error(`Could not find \`package.json\` from ${__dirname}`);
    }
    current = path.dirname(current);
  }
  const pkg = JSON.parse(
    nodeFs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'),
  ) as PackageJson;
  if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') {
    throw new Error(`Invalid \`package.json\` near ${__dirname}`);
  }
  return { pkgRoot, pkg: pkg as AppiumPackageJson };
}

const { pkg, pkgRoot } = readPackageJsonSync();

export const npmPackage = pkg;
export const appiumPackageRoot = pkgRoot;
