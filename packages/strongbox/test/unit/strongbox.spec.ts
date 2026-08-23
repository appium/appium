import assert from 'node:assert/strict';
import type fs from 'node:fs/promises';
import path from 'node:path';
import {before, beforeEach, describe, it, mock} from 'node:test';

import type {SinonSandbox, SinonStub, SinonStubbedMember} from 'sinon';
import {createSandbox} from 'sinon';

import type * as StrongboxLib from '../../lib/index.js';
import type {Item, Strongbox as TStrongbox, StrongboxOpts, Value} from '../../lib/index.js';

type MockFs = Pick<
  {[K in keyof typeof fs]: SinonStubbedMember<(typeof fs)[K]>},
  'opendir' | 'rm' | 'mkdir' | 'readFile' | 'unlink' | 'writeFile'
>;

describe('Strongbox', function () {
  let strongbox: (name: string, opts?: Partial<StrongboxOpts>) => TStrongbox;
  let Strongbox: typeof StrongboxLib.Strongbox;
  let sandbox: SinonSandbox;
  let DEFAULT_SUFFIX: string;
  let MockFs: MockFs;
  let envPathsStub: SinonStub;

  const DATA_DIR = path.resolve('some', 'dir', 'strongbox');

  before(async function () {
    sandbox = createSandbox();
    MockFs = {
      opendir: sandbox.stub(),
      rm: sandbox.stub(),
      mkdir: sandbox.stub(),
      readFile: sandbox.stub(),
      unlink: sandbox.stub(),
      writeFile: sandbox.stub(),
    };
    envPathsStub = sandbox.stub();
    // mocks the modules for the lifetime of this file; individual stub
    // behavior is reset (not the modules themselves) between tests below
    mock.module('node:fs/promises', {namedExports: MockFs});
    mock.module('env-paths', {defaultExport: envPathsStub});
    ({strongbox, DEFAULT_SUFFIX, Strongbox} = await import('../../lib/index.js'));
  });

  beforeEach(function () {
    sandbox.resetHistory();
    sandbox.resetBehavior();
    for (const stub of Object.values(MockFs)) {
      stub.resolves();
    }
    envPathsStub.returns({data: DATA_DIR});
  });

  describe('static method', function () {
    describe('create()', function () {
      it('should return a new Strongbox', function () {
        const box = strongbox('test');
        assert.ok(box instanceof Strongbox);
      });

      describe('when provided an absolute container path', function () {
        it('should use the provided container path', function () {
          const container = path.resolve(path.sep, 'somewhere');
          assert.strictEqual(strongbox('test', {container}).container, container);
        });

        it('should slugify the path segments but keep the path absolute', function () {
          const container = path.resolve(path.sep, 'some dir', 'another one');
          const {container: actual} = strongbox('test', {container});

          assert.ok(path.isAbsolute(actual));
          // the root is what makes the path absolute, so it must survive untouched
          assert.strictEqual(path.parse(actual).root, path.parse(container).root);
          assert.strictEqual(actual, path.join(path.parse(container).root, 'some-dir', 'another-one'));
        });

        it('should handle a path written with forward slashes', function () {
          const {root} = path.parse(path.resolve(path.sep));
          const {container} = strongbox('test', {container: `${root}some dir/another one`});

          assert.strictEqual(container, path.join(root, 'some-dir', 'another-one'));
        });
      });

      describe('when provided a relative container path', function () {
        it('should throw an error', function () {
          const container = path.join('somewhere', 'else');

          assert.throws(() => strongbox('test', {container}), {
            name: 'TypeError',
            message: `container slug ${container} must be an absolute path`,
          });
        });
      });

      describe('when provided a suffix', function () {
        it('should use the provided suffix', function () {
          assert.strictEqual(strongbox('test', {suffix: 'mooo'}).suffix, 'mooo');
        });
      });
    });
  });

  describe('instance method', function () {
    let box: TStrongbox;

    beforeEach(function () {
      box = strongbox('test');
    });

    describe('createItem()', function () {
      describe('when a Item with the same id does not exist', function () {
        describe('when the file does not exist', function () {
          let item: Item<Value>;

          beforeEach(async function () {
            item = await box.createItem('SLUG test');
          });

          it('should create an empty Item', async function () {
            assert.deepStrictEqual(
              {...item},
              {
                id: path.resolve(DATA_DIR, 'strongbox', 'SLUG-test'),
                name: 'SLUG test',
                encoding: 'utf8',
                value: undefined,
                container: path.resolve(DATA_DIR, 'strongbox'),
              },
            );
          });
        });

        describe('when the file exists', function () {
          beforeEach(function () {
            MockFs.readFile.resolves('foo bar');
          });
          it('should read its value', async function () {
            const item = await box.createItem('SLUG test');
            assert.deepStrictEqual(
              {...item},
              {
                id: path.resolve(DATA_DIR, 'strongbox', 'SLUG-test'),
                name: 'SLUG test',
                encoding: 'utf8',
                value: 'foo bar',
                container: path.resolve(DATA_DIR, 'strongbox'),
              },
            );
          });
        });

        describe('when attempting to read the file throws a non-ENOENT error', function () {
          beforeEach(function () {
            MockFs.readFile.rejects(new Error('ETOOMANYGOATS'));
          });
          it('should reject', async function () {
            await assert.rejects(box.createItem('SLUG test'), {message: 'ETOOMANYGOATS'});
          });
        });

        describe('when a value is written to the Item', function () {
          it('should write a string value to the underlying file', async function () {
            const item = await box.createItem('test');
            await item.write('boo bah');

            assert.strictEqual(
              MockFs.writeFile.calledWith(path.resolve(DATA_DIR, DEFAULT_SUFFIX, 'test'), 'boo bah', 'utf8'),
              true,
            );
          });

          it('should update the underlying value', async function () {
            const item = await box.createItem('test');
            await item.write('boo bah');
            assert.strictEqual(item.value, 'boo bah');
          });
        });
      });

      describe('when a Item with the same id already exists', function () {
        it('should throw an error', async function () {
          await box.createItem('test');
          await assert.rejects(box.createItem('test'), {
            message: `Item with id "${path.resolve(DATA_DIR, 'strongbox', 'test')}" already exists`,
          });
        });
      });

      describe('when the second parameter is a valid encoding', function () {
        it('should create the empty Item with the proper encoding', async function () {
          const item = await box.createItem('test', 'base64');
          assert.strictEqual(item.encoding, 'base64');
        });
      });
    });

    describe('clearAll()', function () {
      let clear: SinonStub<never[], Promise<void>>;

      beforeEach(async function () {
        const item = await box.createItem<string>('SLUG test');
        clear = sandbox.stub(item, 'clear');
      });

      it('should call clear() on each item', async function () {
        await box.clearAll();
        assert.strictEqual(clear.calledOnce, true);
      });

      describe('when there is some other error', function () {
        beforeEach(function () {
          clear.rejects(new Error('ETOOMANYGOATS'));
        });

        it('should reject', async function () {
          await assert.rejects(box.clearAll());
        });
      });
    });

    describe('createItemWithValue()', function () {
      it('should create a Item with the given value', async function () {
        const item = await box.createItemWithValue('test', 'value');
        assert.strictEqual(item.value, 'value');
      });

      it('should write the value to disk', async function () {
        await box.createItemWithValue('test', 'value');
        assert.strictEqual(MockFs.writeFile.calledWith(path.resolve(DATA_DIR, DEFAULT_SUFFIX, 'test'), 'value'), true);
      });

      describe('when the third parameter is a valid encoding', function () {
        it('should create the Item with the given value and proper encoding', async function () {
          const item = await box.createItemWithValue('test', 'value', 'base64');
          assert.strictEqual(item.encoding, 'base64');
        });
      });
    });

    describe('getItem()', function () {
      describe('when there is no known Item with the given id', function () {
        it('should return undefined', function () {
          assert.strictEqual(box.getItem('test'), undefined);
        });
      });

      describe('when there is a known Item with the given id', function () {
        it('should return the Item', async function () {
          const item = await box.createItem('test');
          assert.strictEqual(box.getItem(item.id), item);
        });
      });
    });

    describe('listItems()', function () {
      function dirent(name: string, file = true) {
        return {
          name,
          isFile: () => file,
          isDirectory: () => !file,
        };
      }

      function mockOpendir(entries: any[]) {
        MockFs.opendir.resolves({
          async *[Symbol.asyncIterator]() {
            for (const e of entries) {
              yield e;
            }
          },
          close: sandbox.stub().resolves(),
        } as any);
      }

      it('should return Items for each file in opendir iteration order', async function () {
        mockOpendir([dirent('zebra'), dirent('alpha'), dirent('nested', false)]);
        const items = await box.listItems();
        assert.deepStrictEqual(
          items.map((i) => i.name),
          ['zebra', 'alpha'],
        );
        assert.strictEqual(MockFs.opendir.calledWith(box.container), true);
      });

      it('should return an empty array when the container does not exist', async function () {
        const err = Object.assign(new Error('ENOENT'), {code: 'ENOENT'});
        MockFs.opendir.rejects(err);
        assert.deepStrictEqual(await box.listItems(), []);
      });

      it('should rethrow non-ENOENT errors', async function () {
        MockFs.opendir.rejects(new Error('EACCES'));
        await assert.rejects(box.listItems(), {message: 'EACCES'});
      });

      it('should reuse an Item already registered on this instance', async function () {
        const existing = await box.createItem('alpha');
        mockOpendir([dirent('alpha'), dirent('zebra')]);
        const items = await box.listItems();
        assert.strictEqual(items[0], existing);
        assert.deepStrictEqual(
          items.map((i) => i.name),
          ['alpha', 'zebra'],
        );
      });
    });

    describe('Symbol.asyncIterator', function () {
      function dirent(name: string, file = true) {
        return {
          name,
          isFile: () => file,
          isDirectory: () => !file,
        };
      }

      function mockOpendir(entries: any[]) {
        MockFs.opendir.resolves({
          async *[Symbol.asyncIterator]() {
            for (const e of entries) {
              yield e;
            }
          },
          close: sandbox.stub().resolves(),
        } as any);
      }

      it('should yield the same Items in the same order as listItems()', async function () {
        mockOpendir([dirent('zebra'), dirent('alpha'), dirent('nested', false)]);
        const fromList = await box.listItems();
        const fromIter: typeof fromList = [];
        for await (const item of box) {
          fromIter.push(item);
        }
        assert.deepStrictEqual(fromIter, fromList);
      });

      it('should yield nothing when the container does not exist', async function () {
        const err = Object.assign(new Error('ENOENT'), {code: 'ENOENT'});
        MockFs.opendir.rejects(err);
        const out: any[] = [];
        for await (const item of box) {
          out.push(item);
        }
        assert.deepStrictEqual(out, []);
      });

      it('should rethrow non-ENOENT errors', async function () {
        MockFs.opendir.rejects(new Error('EACCES'));
        const gen = box[Symbol.asyncIterator]();
        await assert.rejects(gen.next(), {message: 'EACCES'});
      });
    });
  });
});
