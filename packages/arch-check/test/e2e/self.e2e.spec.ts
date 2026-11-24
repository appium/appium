import assert from 'node:assert/strict';
import {cp, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {main} from '../../lib/cli.js';
import {checkPackage, initPackage} from '../../lib/index.js';

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
    const dir = await mkdtemp(path.join(tmpdir(), 'arch-check-self-'));
    try {
      for (const entry of ['lib', 'package.json', 'tsconfig.json']) {
        await cp(path.join(PACKAGE_DIR, entry), path.join(dir, entry), {recursive: true});
      }
      await initPackage(dir);
      assert.deepEqual((await checkPackage(dir)).findings, []);
    } finally {
      await rm(dir, {recursive: true, force: true});
    }
  });
});
