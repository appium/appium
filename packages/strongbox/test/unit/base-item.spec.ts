import assert from 'node:assert/strict';
import type fs from 'node:fs/promises';
import path from 'node:path';
import {before, beforeEach, describe, it, mock} from 'node:test';

import type {SinonSandbox, SinonStubbedMember} from 'sinon';
import {createSandbox} from 'sinon';

import type {BaseItem as TBaseItem} from '../../lib/base-item.js';
import type {Item, Strongbox} from '../../lib/index.js';

type MockFs = Pick<
  {[K in keyof typeof fs]: SinonStubbedMember<(typeof fs)[K]>},
  'mkdir' | 'readFile' | 'unlink' | 'writeFile'
>;

describe('Strongbox', function () {
  let sandbox: SinonSandbox;
  let MockFs: MockFs;
  const DATA_DIR = path.resolve(path.sep, 'some', 'dir');
  let BaseItem: typeof TBaseItem;

  before(async function () {
    sandbox = createSandbox();
    MockFs = {
      mkdir: sandbox.stub(),
      readFile: sandbox.stub(),
      unlink: sandbox.stub(),
      writeFile: sandbox.stub(),
    };
    // mocks the module for the lifetime of this file; individual stub
    // behavior is reset (not the module itself) between tests below
    mock.module('node:fs/promises', {namedExports: MockFs});
    ({BaseItem} = await import('../../lib/base-item.js'));
  });

  beforeEach(function () {
    sandbox.reset();
    for (const stub of Object.values(MockFs)) {
      stub.resolves();
    }
  });

  describe('BaseItem', function () {
    describe('constructor', function () {
      it('should set the id property based on the parent container', function () {
        const item = new BaseItem('foo', {container: DATA_DIR} as Strongbox);
        assert.strictEqual(item.id, path.join(DATA_DIR, 'foo'));
      });
    });

    describe('method', function () {
      let item: Item<string>;

      beforeEach(function () {
        item = new BaseItem('foo', {container: DATA_DIR} as Strongbox);
      });
      describe('clear()', function () {
        it('should remove the item from the filesystem', async function () {
          await item.clear();
          assert.strictEqual(MockFs.unlink.calledWith(item.id), true);
        });

        describe('if the item does not exist', function () {
          beforeEach(function () {
            MockFs.unlink.rejects({code: 'ENOENT'});
          });
          it('should not reject', async function () {
            await assert.doesNotReject(item.clear());
          });
        });

        describe('if something else goes wrong', function () {
          beforeEach(function () {
            MockFs.unlink.rejects(new Error('ugh'));
          });
          it('should reject', async function () {
            await assert.rejects(item.clear(), {message: 'ugh'});
          });
        });
      });

      describe('read()', function () {
        beforeEach(function () {
          MockFs.readFile.resolves('skunk');
        });
        it('should read the item from the fileystem', async function () {
          assert.strictEqual(await item.read(), 'skunk');
        });

        it('should set the item value to the read value', async function () {
          await item.read();
          assert.strictEqual(item.value, 'skunk');
        });
      });

      describe('write()', function () {
        beforeEach(async function () {
          await item.write('bar');
        });

        it('should write the new item value to the filesystem', async function () {
          assert.strictEqual(MockFs.writeFile.calledWith(item.id, 'bar'), true);
        });

        it('should create the container', function () {
          assert.strictEqual(MockFs.mkdir.calledWith(path.dirname(item.id), {recursive: true}), true);
        });
      });
    });
  });
});
