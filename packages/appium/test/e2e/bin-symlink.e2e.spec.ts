import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {after, before, describe, it} from 'node:test';

import {exec} from 'teen_process';

import {APPIUM_ROOT} from '../helpers.js';

// `process.argv[1]` retains the invoked path as-is on Unix (the bin symlink npm creates for a
// global install), while `import.meta.url`'s resolved value follows the symlink to the real
// file — a naive `process.argv[1] === fileURLToPath(import.meta.url)` "am I the entry module"
// check is therefore always false when launched this way, and `main()` is silently never called.
describe('bin symlink invocation', {skip: process.platform === 'win32'}, function () {
  let symlinkDir: string;
  let binSymlink: string;

  before(async function () {
    symlinkDir = await mkdtemp(path.join(tmpdir(), 'appium-bin-symlink-'));
    binSymlink = path.join(symlinkDir, 'appium');
    await symlink(path.join(APPIUM_ROOT, 'index.js'), binSymlink);
  });

  after(async function () {
    await rm(symlinkDir, {recursive: true, force: true});
  });

  it('should run main() when invoked through a bin-style symlink', async function () {
    const {stdout} = await exec(process.execPath, [binSymlink, '--version']);
    const {version} = JSON.parse(await readFile(path.join(APPIUM_ROOT, 'package.json'), 'utf8'));
    assert.strictEqual(stdout.trim(), version);
  });
});
