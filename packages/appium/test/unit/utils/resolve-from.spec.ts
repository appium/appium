import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {resolvePackageJsonFrom, resolvePackageSubpathFrom} from '../../../lib/utils/resolve-from';

describe('resolve-from', function () {
  let root: string;
  let searchRoot: string;

  beforeEach(async function () {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'appium-resolve-from-'));
    searchRoot = path.join(root, 'packages', 'app');
    await fs.mkdir(searchRoot, {recursive: true});
  });

  afterEach(async function () {
    await fs.rm(root, {recursive: true, force: true});
  });

  it('should honor package exports when resolving a schema from its install path', async function () {
    const packageName = 'exported-schema-driver';
    const packageRoot = await createPackage(packageName, {
      exports: {'./schema.json': './build/schema.json'},
    });
    const schemaPath = path.join(packageRoot, 'build', 'schema.json');
    await fs.mkdir(path.dirname(schemaPath), {recursive: true});
    await fs.writeFile(schemaPath, JSON.stringify({type: 'object'}));

    assert.strictEqual(
      await resolvePackageSubpathFrom(packageRoot, packageName, 'schema.json'),
      await fs.realpath(schemaPath),
    );
  });

  it('should resolve a schema from an externally linked package without exports', async function () {
    const packageName = 'linked-schema-driver';
    const packageRoot = path.join(root, 'external', packageName);
    const schemaPath = path.join(packageRoot, 'schema.json');
    await fs.mkdir(packageRoot, {recursive: true});
    await fs.writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({name: packageName, version: '1.0.0'}));
    await fs.writeFile(schemaPath, JSON.stringify({type: 'object'}));

    assert.strictEqual(
      await resolvePackageSubpathFrom(packageRoot, packageName, 'schema.json'),
      await fs.realpath(schemaPath),
    );
  });

  it('should reject a schema excluded by package exports', async function () {
    const packageName = 'unexported-schema-driver';
    const packageRoot = await createPackage(packageName, {
      exports: {'.': './index.js'},
    });
    const schemaPath = path.join(packageRoot, 'schema.json');
    await fs.writeFile(schemaPath, JSON.stringify({type: 'object'}));

    await assert.rejects(
      resolvePackageSubpathFrom(packageRoot, packageName, 'schema.json'),
      (error: NodeJS.ErrnoException) => error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
    );
  });

  it('should not resolve an exported schema from another copy of the package', async function () {
    const packageName = 'duplicate-schema-driver';
    const otherPackageRoot = await createPackage(packageName, {
      exports: {'./schema.json': './other-schema.json'},
    });
    await fs.writeFile(path.join(otherPackageRoot, 'other-schema.json'), JSON.stringify({title: 'other'}));

    const packageRoot = path.join(root, 'external', packageName);
    const schemaPath = path.join(packageRoot, 'build', 'schema.json');
    await fs.mkdir(path.dirname(schemaPath), {recursive: true});
    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({
        name: packageName,
        version: '1.0.0',
        exports: {'./schema.json': './build/schema.json'},
      }),
    );
    await fs.writeFile(schemaPath, JSON.stringify({title: 'known'}));

    assert.strictEqual(
      await resolvePackageSubpathFrom(packageRoot, packageName, 'schema.json'),
      await fs.realpath(schemaPath),
    );
  });

  it('should find the package manifest when the root export is import-only', async function () {
    const packageRoot = await createPackage('import-only-driver', {
      type: 'module',
      exports: {'.': {import: './index.js'}},
      appium: {driverName: 'import-only'},
    });
    const packageJsonPath = await resolvePackageJsonFrom(searchRoot, 'import-only-driver');

    assert.strictEqual(packageJsonPath, await fs.realpath(path.join(packageRoot, 'package.json')));
    assert.strictEqual(JSON.parse(await fs.readFile(packageJsonPath, 'utf8')).appium.driverName, 'import-only');
  });

  it('should return the owning package manifest when an exported directory has its own package.json', async function () {
    const packageRoot = await createPackage('nested-manifest-driver', {
      exports: {'./build/index.js': './build/index.js'},
      appium: {driverName: 'nested-manifest'},
    });
    await fs.mkdir(path.join(packageRoot, 'build'), {recursive: true});
    await fs.writeFile(path.join(packageRoot, 'build', 'package.json'), JSON.stringify({type: 'commonjs'}));
    await fs.writeFile(path.join(packageRoot, 'build', 'index.js'), 'module.exports = {};');

    const packageJsonPath = await resolvePackageJsonFrom(searchRoot, 'nested-manifest-driver');

    assert.strictEqual(packageJsonPath, await fs.realpath(path.join(packageRoot, 'package.json')));
    assert.strictEqual(JSON.parse(await fs.readFile(packageJsonPath, 'utf8')).appium.driverName, 'nested-manifest');
  });

  async function createPackage(packageName: string, manifest: Record<string, unknown>): Promise<string> {
    const packageRoot = path.join(root, 'node_modules', packageName);
    await fs.mkdir(packageRoot, {recursive: true});
    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({name: packageName, version: '1.0.0', ...manifest}),
    );
    return packageRoot;
  }
});
