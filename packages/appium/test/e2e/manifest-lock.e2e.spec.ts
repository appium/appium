import assert from 'node:assert/strict';
import {spawn, type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';

const envUrl = new URL('../../lib/utils/env.js', import.meta.url).href;

describe('manifest lock recovery', function () {
  let root: string;
  let children: ChildProcess[];

  beforeEach(async function () {
    root = await mkdtemp(path.join(tmpdir(), 'appium-manifest-lock-'));
    children = [];
  });

  afterEach(async function () {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit');
        child.kill('SIGKILL');
        await exited;
      }
    }
    await rm(root, {recursive: true, force: true});
  });

  function start(body: string) {
    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import {withManifestLock, resolveManifestLockfilePath} from ${JSON.stringify(envUrl)};
      const home = ${JSON.stringify(path.join(root, 'appium-home'))};
      ${body}
    `,
      ],
      {env: {...process.env, HOME: root, USERPROFILE: root}, stdio: ['ignore', 'pipe', 'pipe', 'ipc']},
    );
    children.push(child);
    let stderr = '';
    child.stderr!.on('data', (chunk) => {
      stderr += chunk;
    });
    const acquired = new Promise<string>((resolve, reject) => {
      child.once('message', (message) => resolve(String(message)));
      child.once('exit', (code) => reject(new Error(`Child exited with ${code}: ${stderr}`)));
      child.once('error', reject);
    });
    return {child, acquired};
  }

  const hold = `await withManifestLock(home, async () => {
    process.send(await resolveManifestLockfilePath(home));
    await new Promise(resolve => process.once('message', resolve));
  }); process.disconnect();`;

  it('should recover after a lock owner is killed', {timeout: 20000}, async function () {
    const first = start(hold);
    await first.acquired;
    const exited = once(first.child, 'exit');
    first.child.kill('SIGKILL');
    await exited;
    const next = start(hold);
    await next.acquired;
    const released = once(next.child, 'exit');
    next.child.send('release');
    assert.equal((await released)[0], 0);
  });

  it('should keep a live owner exclusive beyond the stale interval', {timeout: 20000}, async function () {
    const first = start(hold);
    await first.acquired;
    const second = start(hold);
    let entered = false;
    void second.acquired.then(
      () => {
        entered = true;
      },
      () => {},
    );
    await delay(11500);
    assert.equal(entered, false);
    first.child.send('release');
    await second.acquired;
    const released = once(second.child, 'exit');
    second.child.send('release');
    assert.equal((await released)[0], 0);
  });

  it('should release after a callback rejects', async function () {
    const first = start(`
      try { await withManifestLock(home, () => { throw new Error('callback failed'); }); }
      catch (err) { if (err.message !== 'callback failed') throw err; }
      process.send('done'); process.disconnect();
    `);
    await first.acquired;
    const next = start(hold);
    await next.acquired;
    const released = once(next.child, 'exit');
    next.child.send('release');
    assert.equal((await released)[0], 0);
  });

  it('should explain how to recover a legacy file without removing an unknown owner lock', async function () {
    const first = start(`process.send(await resolveManifestLockfilePath(home)); process.disconnect();`);
    const lockPath = await first.acquired;
    await mkdir(path.dirname(lockPath), {recursive: true});
    await writeFile(lockPath, 'legacy');
    const next = start(`
      try { await withManifestLock(home, () => {}); throw new Error('unexpected acquisition'); }
      catch (err) { process.send(err.message); } process.disconnect();
    `);
    assert.match(await next.acquired, /legacy manifest lock.*Stop other Appium processes/);
    assert.equal(await readFile(lockPath, 'utf8'), 'legacy');
  });
});
