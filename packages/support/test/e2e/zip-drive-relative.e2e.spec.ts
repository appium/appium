import assert from 'node:assert/strict';
import path from 'node:path';
import {Readable} from 'node:stream';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {fs, tempDir} from '../../lib/index.js';
import {isWindows} from '../../lib/system.js';
import * as zip from '../../lib/zip.js';
import {buildZip} from '../zip-builder.js';

describe('Windows ZIP symlink containment', {skip: !isWindows()}, function () {
  let root: string;
  let outside: string;

  beforeEach(async function () {
    root = await tempDir.openDir();
    outside = path.resolve(`${path.basename(root)}-escaped.txt`);
  });

  afterEach(async function () {
    await fs.rimraf(root);
    await fs.rimraf(outside);
  });

  for (const streaming of [false, true]) {
    for (const large of [false, true]) {
      for (const existing of [false, true]) {
        it(`should reject a pre-existing link to an ${existing ? 'existing' : 'absent'} target (${streaming ? 'stream' : 'file'}, ${large ? 'large' : 'small'})`, async function () {
          const output = path.join(root, 'output');
          const target = path.join(root, 'outside.txt');
          await fs.mkdir(output);
          if (existing) {
            await fs.writeFile(target, 'original');
          }
          await fs.symlink(target, path.join(output, 'link'));
          const archive = buildZip([
            {name: 'link', data: large ? Buffer.alloc(5 * 1024 * 1024, 0x61) : 'marker', mode: 0o100644},
          ]);
          const source = path.join(root, 'archive.zip');
          await fs.writeFile(source, archive);
          await assert.rejects(
            streaming ? zip.extractStreamTo(Readable.from([archive]), output) : zip.extractAllTo(source, output),
            /Cannot write a file over existing symlink/,
          );
          assert.strictEqual((await fs.lstat(path.join(output, 'link'))).isSymbolicLink(), true);
          if (existing) {
            assert.strictEqual(await fs.readFile(target, 'utf8'), 'original');
          } else {
            assert.strictEqual(await fs.exists(target), false);
          }
        });
      }
    }

    for (const lowercase of [false, true]) {
      it(`should reject a ${lowercase ? 'lowercase' : 'uppercase'} drive target (${streaming ? 'stream' : 'file'})`, async function () {
        const drive = path.parse(outside).root.slice(0, 2);
        const target = `${lowercase ? drive.toLowerCase() : drive.toUpperCase()}${path.basename(outside)}`;
        const archive = buildZip([{name: 'link', data: target, mode: 0o120777}]);
        const output = path.join(root, 'output');
        const source = path.join(root, 'archive.zip');
        await fs.writeFile(source, archive);

        await assert.rejects(
          streaming ? zip.extractStreamTo(Readable.from([archive]), output) : zip.extractAllTo(source, output),
          /Out of bound symlink target/,
        );
        // lstat also detects dangling links, unlike exists/stat.
        await assert.rejects(fs.lstat(path.join(output, 'link')), {code: 'ENOENT'});
        assert.strictEqual(await fs.exists(outside), false);
      });
    }
  }

  it('should reject a drive-relative link before a duplicate file entry can write through it', async function () {
    const target = `${path.parse(outside).root.slice(0, 2)}${path.basename(outside)}`;
    const source = path.join(root, 'duplicate.zip');
    const output = path.join(root, 'output');
    await fs.writeFile(
      source,
      buildZip([
        {name: 'link', data: target, mode: 0o120777},
        {name: 'link', data: 'regression marker', mode: 0o100644},
      ]),
    );
    await assert.rejects(zip.extractAllTo(source, output), /Out of bound symlink target/);
    await assert.rejects(fs.lstat(path.join(output, 'link')), {code: 'ENOENT'});
    assert.strictEqual(await fs.exists(outside), false);
  });
});
