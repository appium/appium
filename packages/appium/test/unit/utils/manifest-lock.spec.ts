import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import * as os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, it, mock, type TestContext} from 'node:test';

import * as support from '@appium/support';

import type * as Env from '../../../lib/utils/env.js';

describe('manifest lock recovery guidance', function () {
  let root: string;
  let appiumHome: string;
  let lockFile: string;
  let env: typeof Env;
  let acquisitionError: Error | undefined;
  let importCounter = 0;

  beforeEach(async function (context) {
    const t = context as TestContext;
    root = await mkdtemp(path.join(os.tmpdir(), 'appium-manifest-lock-'));
    appiumHome = path.join(root, 'appium-home');
    acquisitionError = undefined;
    t.mock.module('node:os', {namedExports: {homedir: () => root}});
    t.mock.module('@appium/support', {
      namedExports: {
        ...support,
        util: {
          ...support.util,
          // Exercise the real lock implementation without waiting its production 120-second timeout.
          getLockFileGuard: (file: string) => {
            if (acquisitionError) {
              return async () => {
                throw acquisitionError;
              };
            }
            return support.util.getLockFileGuard(file, {timeout: 0});
          },
        },
      },
    });
    env = await import(`../../../lib/utils/env.js?manifest-lock=${importCounter++}`);
    lockFile = await env.resolveManifestLockfilePath(appiumHome);
    await mkdir(path.dirname(lockFile), {recursive: true});
  });

  afterEach(async function () {
    mock.reset();
    await rm(root, {recursive: true, force: true});
  });

  it('should explain manual recovery while preserving an existing lock', async function () {
    await writeFile(lockFile, 'existing lock');
    let called = false;
    await assert.rejects(
      env.withManifestLock(appiumHome, () => {
        called = true;
      }),
      (err: Error) => {
        assert.ok(err.message.includes(appiumHome));
        assert.ok(err.message.includes(lockFile));
        assert.match(err.message, /stop all Appium servers and extension CLI commands/);
        assert.match(err.message, /before manually removing/);
        assert.ok(err.cause instanceof Error);
        assert.match(err.cause.message, /Could not acquire lock/);
        assert.equal((err.cause.cause as NodeJS.ErrnoException).code, 'EEXIST');
        return true;
      },
    );
    assert.equal(called, false);
    assert.equal(await readFile(lockFile, 'utf8'), 'existing lock');
  });

  it('should leave a live owner locked and allow reuse after it releases', async function () {
    await support.util.getLockFileGuard(lockFile)(async () => {
      await assert.rejects(
        env.withManifestLock(appiumHome, () => assert.fail('lock was stolen')),
        /before manually removing/,
      );
      assert.equal(await readFile(lockFile, 'utf8'), '');
    });
    assert.equal(await env.withManifestLock(appiumHome, () => 'acquired'), 'acquired');
  });

  it('should preserve non-contention acquisition errors without recovery advice', async function () {
    acquisitionError = new Error('permission denied', {cause: Object.assign(new Error('EACCES'), {code: 'EACCES'})});
    await assert.rejects(
      env.withManifestLock(appiumHome, () => assert.fail('lock was not acquired')),
      (err: Error) => err === acquisitionError,
    );
  });

  it('should preserve callback failures even when they resemble lock contention', async function () {
    const failure = new Error('callback failed', {cause: Object.assign(new Error('EEXIST'), {code: 'EEXIST'})});
    await assert.rejects(
      env.withManifestLock(appiumHome, async () => {
        throw failure;
      }),
      (err: Error) => err === failure,
    );
    assert.equal(await env.withManifestLock(appiumHome, () => 'acquired'), 'acquired');
  });
});
