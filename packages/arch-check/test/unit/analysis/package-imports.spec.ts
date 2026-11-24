import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {
  externalPackageName,
  findPackageImports,
  parseScopedSpecifier,
  type PackageImportContext,
} from '../../../lib/analysis/package-imports.js';
import {mod} from './modules.js';

describe('parseScopedSpecifier', () => {
  it('parses scoped specifiers', () => {
    assert.deepEqual(parseScopedSpecifier('@appium/support', ['@appium']), {pkg: '@appium/support'});
    assert.deepEqual(parseScopedSpecifier('@appium/support/lib/fs.js', ['@appium']), {
      pkg: '@appium/support',
      subpath: './lib/fs.js',
    });
    assert.equal(parseScopedSpecifier('@other/x', ['@appium']), null);
    assert.equal(parseScopedSpecifier('@appium/support', []), null);
  });
});

describe('externalPackageName', () => {
  it('names the package behind an import specifier', () => {
    assert.equal(externalPackageName('lodash'), 'lodash');
    assert.equal(externalPackageName('lodash/fp.js'), 'lodash');
    assert.equal(externalPackageName('@appium/support/lib/fs.js'), '@appium/support');
  });

  it('skips paths, `#` and `node:` imports and built-ins', () => {
    for (const skipped of [
      './a.js',
      '../a.js',
      '/abs.js',
      '#internal',
      'node:fs',
      'fs',
      'fs/promises',
      'data:text/js,1',
    ]) {
      assert.equal(externalPackageName(skipped), null, skipped);
    }
  });
});

describe('findPackageImports', () => {
  let packageDir: string;

  beforeEach(async () => {
    packageDir = await mkdtemp(path.join(tmpdir(), 'arch-check-pi-'));
  });

  afterEach(async () => {
    await rm(packageDir, {recursive: true, force: true});
  });

  const context = (overrides: Partial<PackageImportContext> = {}): PackageImportContext => ({
    packageDir,
    prefix: 'lib/',
    entryPointScopes: ['@scope'],
    undeclaredDependencies: 'error',
    declared: {name: 'me', runtime: new Set(['dep']), dev: new Set(['dev-only'])},
    runtimeModules: [],
    ...overrides,
  });
  const keys = async (modules: ReturnType<typeof mod>[], ctx = context()) =>
    (await findPackageImports(modules, ctx)).map((f) => f.key);

  it('accepts declared packages, built-ins, the package itself and aliases into the source root', async () => {
    const modules = [
      mod('lib/a.ts', ['dep', 'dep/sub.js', 'node:fs', 'path', 'me', './x.js', {module: '@/x', resolved: 'lib/x.ts'}]),
    ];
    assert.deepEqual(await keys(modules, context({runtimeModules: modules})), []);
  });

  it('reports undeclared packages', async () => {
    const modules = [mod('lib/a.ts', ['lodash', '@scope/x'])];
    assert.deepEqual(await keys(modules, context({runtimeModules: modules})), [
      'lib/a.ts -> @scope/x',
      'lib/a.ts -> lodash',
    ]);
  });

  it('accepts a devDependency for type-only imports only', async () => {
    const typeOnly = [mod('lib/a.ts', ['dev-only'])];
    assert.deepEqual(await keys(typeOnly), []);
    assert.deepEqual(await keys(typeOnly, context({runtimeModules: typeOnly})), ['lib/a.ts -> dev-only']);
  });

  it('reports deep imports of scoped packages that are not exported', async () => {
    const modules = [mod('lib/a.ts', ['@scope/dep/lib/x.js'])];
    const ctx = context({runtimeModules: modules, declared: {runtime: new Set(['@scope/dep']), dev: new Set()}});
    assert.deepEqual(await keys(modules, ctx), ['lib/a.ts -> @scope/dep/lib/x.js']);
  });

  it('checks only scoped packages unless asked for more', async () => {
    const modules = [mod('lib/a.ts', ['lodash', '@scope/x'])];
    const ctx = context({runtimeModules: modules, undeclaredDependencies: 'ignore'});
    assert.deepEqual(await keys(modules, ctx), ['lib/a.ts -> @scope/x']);
  });

  it('ignores files outside the source root', async () => {
    assert.deepEqual(await keys([mod('../other/a.ts', ['lodash'])]), []);
  });
});
