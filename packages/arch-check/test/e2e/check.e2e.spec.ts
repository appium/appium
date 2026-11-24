import assert from 'node:assert/strict';
import {cp, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {main} from '../../lib/cli.js';
import {checkPackage, updateBaseline, type Finding} from '../../lib/index.js';

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
