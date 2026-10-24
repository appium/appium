import assert from 'node:assert/strict';
import {AsyncLocalStorage} from 'node:async_hooks';
import path from 'node:path';
import {after, before, describe, it} from 'node:test';

import {fs, tempDir} from '@appium/support';

import {configureApp} from '../../../lib/basedriver/helpers/index.js';

describe('configureApp', function () {
  let root: string;
  let appPath: string;

  before(async function () {
    root = await tempDir.openDir();
    appPath = path.join(root, 'app.apk');
    await fs.writeFile(appPath, 'content');
  });

  after(async function () {
    await fs.rimraf(root);
  });

  it('should run a queued configuration in its own async context', async function () {
    const storage = new AsyncLocalStorage<string>();
    const seen: Record<string, string | undefined> = {};
    // onPostProcess runs inside the app cache lock
    const probe = (id: string, delayMs: number) => async () => {
      seen[id] = storage.getStore();
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return undefined;
    };
    const configure = (id: string, delayMs: number) =>
      storage.run(id, () => configureApp(appPath, {supportedExtensions: ['.apk'], onPostProcess: probe(id, delayMs)}));

    const first = configure('first', 50);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await Promise.all([first, configure('second', 0)]);

    assert.deepEqual(seen, {first: 'first', second: 'second'});
  });
});
