import assert from 'node:assert/strict';
import {appendFile, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {main} from '../../lib/cli.js';
import {checkPackage, initPackage, updateBaseline, type Finding} from '../../lib/index.js';

// Compiled to build/test/e2e, so the package root is three levels up.
const PACKAGE_DIR = fileURLToPath(new URL('../../../', import.meta.url));

describe('arch-check on itself', () => {
  it('conforms to its own architecture model', async () => {
    const result = await checkPackage(PACKAGE_DIR);
    assert.deepEqual(result.findings, []);
    assert.deepEqual(result.warnings, []);
    assert.ok(result.ok);
  });

  it('exits 0 from the CLI', async () => {
    assert.equal(await main([PACKAGE_DIR]), 0);
  });

  it('derives a conforming model for its own sources', async () => {
    const dir = await copyOfSources();
    await initPackage(dir);
    assert.deepEqual((await checkPackage(dir)).findings, []);
  });

  it('leaves no model behind when init fails, so that it can be retried', async () => {
    const dir = await copyOfSources();
    // The model is generated before the baseline is read, so this fails midway.
    await mkdir(path.join(dir, 'architecture'));
    await writeFile(path.join(dir, 'architecture/baseline.json'), '{');
    await assert.rejects(initPackage(dir));
    assert.deepEqual(await readdir(path.join(dir, 'architecture')), ['baseline.json']);
    await rm(path.join(dir, 'architecture/baseline.json'));
    await initPackage(dir);
    assert.deepEqual((await checkPackage(dir)).findings, []);
  });

  describe('on a copy with violations', () => {
    let dir: string;
    const file = (name: string) => path.join(dir, name);
    const keys = (findings: Finding[], rule: Finding['rule'], status: Finding['status'] = 'new') =>
      findings.filter((f) => f.rule === rule && f.status === status).map((f) => f.key);

    beforeEach(async () => {
      dir = await copyOfSources(true);
    });

    it('flags an import between components that the model does not allow', async () => {
      await appendFile(file('lib/types.ts'), "import {byString} from './util.js';\nexport const x = byString;\n");
      const result = await checkPackage(dir);
      assert.deepEqual(keys(result.findings, 'boundary'), ['lib/types.ts -> lib/util.ts']);
      assert.ok(!result.ok);
      assert.equal(await main([dir]), 1);
    });

    it('flags runtime and type-only cycles separately', async () => {
      await writeFile(file('lib/analysis/a.ts'), "import {b} from './b.js';\nexport const a = () => b;\n");
      await writeFile(file('lib/analysis/b.ts'), "import {a} from './a.js';\nexport const b = () => a;\n");
      const runtime = await checkPackage(dir);
      assert.equal(keys(runtime.findings, 'runtime-cycle').length, 1);

      await writeFile(
        file('lib/analysis/b.ts'),
        "import type {a} from './a.js';\nexport const b = (f?: typeof a) => f;\n",
      );
      const typeOnly = await checkPackage(dir);
      assert.equal(keys(typeOnly.findings, 'runtime-cycle').length, 0);
      assert.equal(keys(typeOnly.findings, 'type-cycle').length, 1);
    });

    it('flags files owned by no component', async () => {
      await writeFile(file('lib/stray.ts'), 'export {};\n');
      assert.deepEqual(keys((await checkPackage(dir)).findings, 'unowned-file'), ['lib/stray.ts']);
    });

    it('tolerates baselined violations and reports them as stale once fixed', async () => {
      const original = await readFile(file('lib/types.ts'), 'utf8');
      await appendFile(file('lib/types.ts'), "import {byString} from './util.js';\nexport const x = byString;\n");
      await updateBaseline(dir);
      const tolerated = await checkPackage(dir);
      assert.ok(tolerated.ok);
      assert.equal(tolerated.baselined.boundaries, 1);
      assert.equal(await main([dir]), 0);

      await writeFile(file('lib/types.ts'), original);
      const stale = await checkPackage(dir);
      assert.ok(!stale.ok);
      assert.deepEqual(keys(stale.findings, 'boundary', 'stale'), ['lib/types.ts -> lib/util.ts']);
      assert.equal(await main([dir]), 1);
    });

    it('exits 2 when the package cannot be checked', async () => {
      assert.equal(await main([path.join(dir, 'nope')]), 2);
      await rm(file('architecture'), {recursive: true});
      assert.equal(await main([dir]), 2);
    });
  });
});

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, {recursive: true, force: true})));
});

/** Copies the package's sources (and its model, if asked to) into a temp directory. */
async function copyOfSources(withModel = false): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'arch-check-self-'));
  dirs.push(dir);
  for (const entry of ['lib', 'package.json', 'tsconfig.json', ...(withModel ? ['architecture'] : [])]) {
    await cp(path.join(PACKAGE_DIR, entry), path.join(dir, entry), {recursive: true});
  }
  return dir;
}
