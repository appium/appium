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

  it('preserves a dangling link reached through an aliased parent directory', async function () {
    const directory = path.join(root, 'real');
    const alias = path.join(root, 'alias');
    await fsPromises.mkdir(directory);
    await fsPromises.symlink(directory, alias);
    const source = path.join(directory, 'link');
    await fsPromises.symlink('missing', source);

    await fs.mv(source, path.join(alias, 'link'));

    assert.equal(await fsPromises.readlink(source), 'missing');
    assert.equal(await fsPromises.readlink(path.join(alias, 'link')), 'missing');
  });

  for (const clobber of [false, true]) {
    it(`treats distinct links to the same target as distinct entries with clobber=${clobber}`, async function () {
      await fsPromises.writeFile(path.join(root, 'target'), 'payload');
      const source = path.join(root, 'source');
      const destination = path.join(root, 'destination');
      await fsPromises.symlink('target', source);
      await fsPromises.symlink('target', destination);

      if (clobber) {
        await fs.mv(source, destination, {clobber});
        await assert.rejects(fsPromises.lstat(source), {code: 'ENOENT'});
      } else {
        await assert.rejects(fs.mv(source, destination, {clobber}), {code: 'EEXIST'});
        assert.equal(await fsPromises.readlink(source), 'target');
      }
      assert.equal(await fsPromises.readlink(destination), 'target');
      assert.equal(await fsPromises.readFile(path.join(root, 'target'), 'utf8'), 'payload');
    });
  }

  it('moves distinct files whose paths become equal after lexical normalization', async function () {
    const directory = path.join(root, 'real');
    await fsPromises.mkdir(path.join(directory, 'child'), {recursive: true});
    await fsPromises.symlink(path.join(directory, 'child'), path.join(root, 'alias'));
    const actualSource = path.join(directory, 'file');
    const destination = path.join(root, 'file');
    await fsPromises.writeFile(actualSource, 'source');
    await fsPromises.writeFile(destination, 'destination');
    // Keep '..' in the input: the filesystem resolves it after following the parent link.
    const source = `${path.join(root, 'alias')}${path.sep}..${path.sep}file`;

    await fs.mv(source, destination);

    await assert.rejects(fsPromises.lstat(actualSource), {code: 'ENOENT'});
    assert.equal(await fsPromises.readFile(destination, 'utf8'), 'source');
  });

  it('preserves a directory when its destination is a link to itself', async function () {
    const source = path.join(root, 'directory');
    const destination = path.join(root, 'alias');
    await fsPromises.mkdir(source);
    await fsPromises.writeFile(path.join(source, 'file'), 'payload');
    await fsPromises.symlink(source, destination);

    await fs.mv(source, destination);

    assert.equal(await fsPromises.readFile(path.join(source, 'file'), 'utf8'), 'payload');
    assert.equal(await fsPromises.readlink(destination), source);
  });

  it('does not treat equal inode numbers on different devices as the same entry', async function () {
    const source = path.join(root, 'source');
    const destination = path.join(root, 'destination');
    await fsPromises.writeFile(source, 'source');
    await fsPromises.writeFile(destination, 'destination');
    const sourceStat = await fsPromises.lstat(source, {bigint: true});
    const destinationStat = await fsPromises.lstat(destination, {bigint: true});
    const lstat = sandbox.stub(fsPromises, 'lstat').callThrough();
    lstat
      .withArgs(destination, {bigint: true})
      .resolves(Object.assign(destinationStat, {ino: sourceStat.ino, dev: sourceStat.dev + 1n}));

    await fs.mv(source, destination);

    await assert.rejects(fsPromises.lstat(source), {code: 'ENOENT'});
    assert.equal(await fsPromises.readFile(destination, 'utf8'), 'source');
  });
});
