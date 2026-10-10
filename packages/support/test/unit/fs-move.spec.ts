import assert from 'node:assert/strict';
import {promises as fsPromises} from 'node:fs';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {createSandbox} from 'sinon';

import {fs, system, tempDir} from '../../lib/index.js';

describe('moving directories with symlinks', {skip: system.isWindows()}, function () {
  const sandbox = createSandbox();
  let root: string;

  beforeEach(async function () {
    root = await tempDir.openDir();
  });

  afterEach(async function () {
    sandbox.restore();
    await fs.rimraf(root);
  });

  for (const crossDevice of [false, true]) {
    for (const targetType of ['file', 'directory', 'missing']) {
      it(`moves a source link to ${targetType} without changing its target with EXDEV=${crossDevice}`, async function () {
        const target = path.join(root, 'target');
        if (targetType === 'directory') {
          await fsPromises.mkdir(target);
          await fsPromises.writeFile(path.join(target, 'file'), 'payload');
        } else if (targetType === 'file') {
          await fsPromises.writeFile(target, 'payload');
        }
        const source = path.join(root, 'source');
        const destination = path.join(root, 'destination');
        await fsPromises.symlink('target', source);
        if (crossDevice) {
          sandbox.stub(fsPromises, 'rename').rejects(Object.assign(new Error('cross-device'), {code: 'EXDEV'}));
        }

        await fs.mv(source, destination, {mkdirp: true});

        await assert.rejects(fsPromises.lstat(source), {code: 'ENOENT'});
        assert.equal(await fsPromises.readlink(destination), 'target');
        if (targetType === 'directory') {
          assert.deepEqual(await fsPromises.readdir(target), ['file']);
          assert.equal(await fsPromises.readFile(path.join(target, 'file'), 'utf8'), 'payload');
        } else if (targetType === 'file') {
          assert.equal(await fsPromises.readFile(target, 'utf8'), 'payload');
        } else {
          await assert.rejects(fsPromises.lstat(target), {code: 'ENOENT'});
        }
      });
    }

    it(`preserves relative, directory and dangling links with EXDEV=${crossDevice}`, async function () {
      const source = path.join(root, 'source');
      const destination = path.join(root, 'destination');
      await fsPromises.mkdir(path.join(source, 'directory'), {recursive: true});
      await fsPromises.writeFile(path.join(source, 'file'), 'payload');
      const links = {fileLink: 'file', directoryLink: 'directory', danglingLink: 'missing'};
      for (const [name, target] of Object.entries(links)) {
        await fsPromises.symlink(target, path.join(source, name));
      }
      if (crossDevice) {
        sandbox.stub(fsPromises, 'rename').rejects(Object.assign(new Error('cross-device'), {code: 'EXDEV'}));
      }

      await fs.mv(source, destination, {mkdirp: true});

      assert.equal(await fs.exists(source), false);
      assert.equal(await fsPromises.readFile(path.join(destination, 'fileLink'), 'utf8'), 'payload');
      assert.equal((await fsPromises.stat(path.join(destination, 'directoryLink'))).isDirectory(), true);
      for (const [name, target] of Object.entries(links)) {
        assert.equal(await fsPromises.readlink(path.join(destination, name)), target);
      }
    });
  }

  it('preserves a dangling source link when moving it onto itself', async function () {
    const source = path.join(root, 'source');
    await fsPromises.symlink('missing', source);

    await fs.mv(source, path.join(root, '.', 'source'));

    assert.equal(await fsPromises.readlink(source), 'missing');
  });
});
