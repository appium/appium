import assert from 'node:assert/strict';
import {cp, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {main} from '../../lib/cli.js';
import {checkPackage, initPackage, updateBaseline, type Finding} from '../../lib/index.js';

const FIXTURE = fileURLToPath(new URL('../../../test/fixtures/sample-package', import.meta.url));

describe('arch-check', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'arch-check-e2e-'));
    await cp(FIXTURE, dir, {recursive: true});
  });

  afterEach(async () => {
    await rm(dir, {recursive: true, force: true});
  });

  const write = (file: string, content: string) => writeFile(path.join(dir, file), content);
  const keys = (findings: Finding[], rule: Finding['rule'], status: Finding['status'] = 'new') =>
    findings.filter((f) => f.rule === rule && f.status === status).map((f) => f.key);

  it('passes a conforming package', async () => {
    const result = await checkPackage(dir);
    assert.deepEqual(result.findings, []);
    assert.ok(result.ok);
  });

  it('flags an import between components that the model does not allow', async () => {
    await write(
      'lib/util/log.ts',
      `import {EXTRA} from '../extras/extra.js';\nexport const log = (m: string) => m + EXTRA;\n`,
    );
    const result = await checkPackage(dir);
    assert.deepEqual(keys(result.findings, 'boundary'), ['lib/util/log.ts -> lib/extras/extra.ts']);
    assert.match(result.findings[0].message, /'sample.util' may not depend on 'sample.extras'/);
  });

  it('flags runtime and type-only cycles separately', async () => {
    await write(
      'lib/services/svc.ts',
      `import {log} from '../util/log.js';\nimport {x} from '../app.js';\nexport const serve = () => log(String(x));\n`,
    );
    await write('lib/app.ts', `import {serve} from './services/svc.js';\nexport const x = serve();\n`);
    const runtime = await checkPackage(dir);
    assert.equal(keys(runtime.findings, 'runtime-cycle').length, 1);

    await write(
      'lib/services/svc.ts',
      `import {log} from '../util/log.js';\nimport type {x} from '../app.js';\nexport const serve = (v?: typeof x) => log(String(v));\n`,
    );
    const typeOnly = await checkPackage(dir);
    assert.equal(keys(typeOnly.findings, 'runtime-cycle').length, 0);
    assert.equal(keys(typeOnly.findings, 'type-cycle').length, 1);
  });

  it('flags files owned by no component', async () => {
    await write('lib/stray.ts', 'export {};\n');
    assert.deepEqual(keys((await checkPackage(dir)).findings, 'unowned-file'), ['lib/stray.ts']);
  });

  it('flags deep and undeclared imports of scoped packages', async () => {
    await write(
      'lib/util/log.ts',
      `import '@scope/declared/lib/deep.js';\nimport '@scope/undeclared';\nimport '@scope/declared';\nexport const log = (m: string) => m;\n`,
    );
    const result = await checkPackage(dir);
    assert.deepEqual(keys(result.findings, 'package-import'), [
      'lib/util/log.ts -> @scope/declared/lib/deep.js',
      'lib/util/log.ts -> @scope/undeclared',
    ]);
  });

  it('allows deep imports that the installed package exports', async () => {
    const installed = path.join(dir, 'node_modules/@scope/declared');
    await mkdir(installed, {recursive: true});
    await writeFile(
      path.join(installed, 'package.json'),
      JSON.stringify({name: '@scope/declared', exports: {'.': './index.js', './feature': './feature.js'}}),
    );
    await write(
      'lib/util/log.ts',
      `import '@scope/declared/feature';\nimport '@scope/declared/lib/deep.js';\nexport const log = (m: string) => m;\n`,
    );
    assert.deepEqual(keys((await checkPackage(dir)).findings, 'package-import'), [
      'lib/util/log.ts -> @scope/declared/lib/deep.js',
    ]);
  });

  it('tolerates baselined violations and reports them as stale once fixed', async () => {
    const original = await readFile(path.join(dir, 'lib/util/log.ts'), 'utf8');
    await write(
      'lib/util/log.ts',
      `import {EXTRA} from '../extras/extra.js';\nexport const log = (m: string) => m + EXTRA;\n`,
    );
    await updateBaseline(dir);
    const tolerated = await checkPackage(dir);
    assert.ok(tolerated.ok);
    assert.equal(tolerated.baselined.boundaries, 1);

    await write('lib/util/log.ts', original);
    const stale = await checkPackage(dir);
    assert.ok(!stale.ok);
    assert.deepEqual(keys(stale.findings, 'boundary', 'stale'), ['lib/util/log.ts -> lib/extras/extra.ts']);
  });

  it('does not report files of unenforced components as unowned, nor check their edges', async () => {
    const model = await readFile(path.join(dir, 'architecture/model.c4'), 'utf8');
    await write(
      'architecture/model.c4',
      model.replace("extras = component 'extras' {", "extras = component 'extras' {\n      #unenforced"),
    );
    await write(
      'lib/util/log.ts',
      `import {EXTRA} from '../extras/extra.js';\nexport const log = (m: string) => m + EXTRA;\n`,
    );
    const result = await checkPackage(dir);
    assert.deepEqual(result.findings, []);
  });

  it('fails when a file belongs to several components', async () => {
    const model = await readFile(path.join(dir, 'architecture/model.c4'), 'utf8');
    await write('architecture/model.c4', model.replace("paths 'lib/extras/**'", "paths 'lib/**'"));
    await assert.rejects(checkPackage(dir), /exactly one component[\s\S]*lib\/app\.ts/);
  });

  it('warns about relative imports it could not resolve', async () => {
    await write('lib/util/log.ts', `import './missing.js';\nexport const log = (m: string) => m;\n`);
    const result = await checkPackage(dir);
    assert.ok(result.ok);
    assert.deepEqual(result.warnings, [
      'lib/util/log.ts -> ./missing.js could not be resolved, so it was not checked.',
    ]);
  });

  it('cannot baseline unowned files or package imports', async () => {
    await write('lib/stray.ts', 'export {};\n');
    const analysis = await updateBaseline(dir);
    assert.deepEqual(analysis.unownedFiles, ['lib/stray.ts']);
    assert.ok(!(await checkPackage(dir)).ok);
  });

  it('ignores type-only cycles when configured', async () => {
    await write(
      'lib/services/svc.ts',
      `import {log} from '../util/log.js';\nimport type {x} from '../app.js';\nexport const serve = (v?: typeof x) => log(String(v));\n`,
    );
    await write('lib/app.ts', `import {serve} from './services/svc.js';\nexport const x = serve();\n`);
    // the type import also crosses an undeclared component edge, so declare it
    const model = await readFile(path.join(dir, 'architecture/model.c4'), 'utf8');
    await write(
      'architecture/model.c4',
      model.replace('  sample.app -> sample.util', '  sample.app -> sample.util\n  sample.services -> sample.app'),
    );
    assert.equal(keys((await checkPackage(dir)).findings, 'type-cycle').length, 1);
    await write('architecture/config.json', '{"entryPointScopes": ["@scope"], "typeOnlyCycles": "ignore"}');
    assert.deepEqual((await checkPackage(dir)).findings, []);
  });

  it('accepts devDependencies for type-only imports only', async () => {
    await write(
      'lib/util/log.ts',
      `import type {T} from '@scope/dev-types';\nexport const log = (m: string, t?: T) => m + t;\n`,
    );
    assert.deepEqual(keys((await checkPackage(dir)).findings, 'package-import'), []);
    await write('lib/util/log.ts', `import {T} from '@scope/dev-types';\nexport const log = (m: string) => m + T;\n`);
    assert.deepEqual(keys((await checkPackage(dir)).findings, 'package-import'), [
      'lib/util/log.ts -> @scope/dev-types',
    ]);
  });

  it('checks that every imported package is declared when asked to', async () => {
    const source = `import 'lodash';
import type {T} from '@scope/dev-types';
import {readFile} from 'node:fs/promises';
import {join} from 'path';
import '@/extras/extra.js';
import 'sample-package';
export const log = (m: string, t?: T) => String(readFile) + join('a') + m + t;
`;
    await write('lib/util/log.ts', source);
    await write(
      'tsconfig.json',
      '{"compilerOptions": {"module": "NodeNext", "moduleResolution": "NodeNext", "baseUrl": ".", "paths": {"@/*": ["lib/*"]}}}',
    );
    const model = await readFile(path.join(dir, 'architecture/model.c4'), 'utf8');
    await write(
      'architecture/model.c4',
      model.replace('  sample.app -> sample.util', '  sample.app -> sample.util\n  sample.util -> sample.extras'),
    );
    assert.deepEqual(keys((await checkPackage(dir)).findings, 'package-import'), []);
    await write('architecture/config.json', '{"entryPointScopes": ["@scope"], "undeclaredDependencies": "error"}');
    assert.deepEqual(keys((await checkPackage(dir)).findings, 'package-import'), ['lib/util/log.ts -> lodash']);
    // used as a value, so the import survives compilation
    await write(
      'lib/util/log.ts',
      source
        .replace("import type {T} from '@scope/dev-types';", "import {T} from '@scope/dev-types';")
        .replace('t?: T', 't = T'),
    );
    assert.deepEqual(keys((await checkPackage(dir)).findings, 'package-import'), [
      'lib/util/log.ts -> @scope/dev-types',
      'lib/util/log.ts -> lodash',
    ]);
  });

  it('initializes a model from the current code', async () => {
    await rm(path.join(dir, 'architecture'), {recursive: true});
    await write(
      'lib/services/svc.ts',
      `import {log} from '../util/log.js';\nimport type {x} from '../app.js';\nexport const serve = (v?: typeof x) => log(String(v));\n`,
    );
    await write('lib/app.ts', `import {serve} from './services/svc.js';\nexport const x = serve();\n`);
    const result = await initPackage(dir, {entryPointScopes: ['@scope']});
    assert.deepEqual(result.files, [
      'architecture/spec.c4',
      'architecture/model.c4',
      'architecture/config.json',
      'architecture/baseline.json',
    ]);
    assert.equal(result.components, 4);
    const check = await checkPackage(dir);
    assert.deepEqual(check.findings, []);
    assert.equal(check.baselined.typeOnlyCycles, 1);
    await assert.rejects(initPackage(dir), /already contains a model/);
  });

  it('does not mistake build output named lib for the source root when initializing', async () => {
    await rm(path.join(dir, 'architecture'), {recursive: true});
    await cp(path.join(dir, 'lib'), path.join(dir, 'src'), {recursive: true});
    await rm(path.join(dir, 'lib'), {recursive: true});
    await mkdir(path.join(dir, 'lib/src'), {recursive: true});
    await write('lib/src/app.js', 'export {};\n');
    await write(
      'tsconfig.json',
      '{"compilerOptions": {"module": "NodeNext", "moduleResolution": "NodeNext", "outDir": "./lib"}}',
    );
    const result = await initPackage(dir);
    assert.ok(result.files.includes('architecture/config.json'));
    assert.equal(JSON.parse(await readFile(path.join(dir, 'architecture/config.json'), 'utf8')).sourceRoot, 'src');
    assert.deepEqual((await checkPackage(dir)).findings, []);
  });

  it('checks several packages and the workspaces of a monorepo from the CLI', async () => {
    await mkdir(path.join(dir, 'packages'));
    const a = path.join(dir, 'packages/a');
    const b = path.join(dir, 'packages/b');
    await cp(FIXTURE, a, {recursive: true});
    await cp(FIXTURE, b, {recursive: true});
    await rm(path.join(b, 'architecture'), {recursive: true});
    await write('package.json', '{"workspaces": ["packages/*"]}');
    assert.equal(await main(['--workspaces', dir]), 0);
    assert.equal(await main([a, a]), 0);
    await writeFile(path.join(a, 'lib/stray.ts'), 'export {};\n');
    assert.equal(await main(['--workspaces', dir]), 1);
    assert.equal(await main([b]), 2);
  });

  it('reports a missing model', async () => {
    await rm(path.join(dir, 'architecture'), {recursive: true});
    await assert.rejects(checkPackage(dir), /No architecture model found/);
  });

  it('exits non-zero from the CLI on violations', async () => {
    assert.equal(await main([dir]), 0);
    await write('lib/stray.ts', 'export {};\n');
    assert.equal(await main([dir]), 1);
    assert.equal(await main([path.join(dir, 'nope')]), 2);
  });
});
