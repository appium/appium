import assert from 'node:assert/strict';
import {readFile, rm} from 'node:fs/promises';
import {afterEach, beforeEach, describe, it} from 'node:test';

import type {Item, Strongbox} from '../../lib/index.js';
import {strongbox} from '../../lib/index.js';

describe('@appium/strongbox', function () {
  describe('default behavior', function () {
    let box: Strongbox;

    beforeEach(function () {
      box = strongbox('test');
    });

    afterEach(async function () {
      await rm(box.container, {recursive: true, force: true});
    });

    describe('when creating an Item with a value', function () {
      let item: Item<string>;

      beforeEach(async function () {
        item = await box.createItemWithValue('test', 'value');
      });

      it('should write the value to the filesystem', async function () {
        assert.strictEqual(await readFile(item.id, 'utf8'), 'value');
      });

      it('should set the value property', async function () {
        assert.strictEqual(item.value, 'value');
      });

      describe('when writing a new value', function () {
        beforeEach(async function () {
          await item.write('new value');
        });

        it('should write the value to the filesystem', async function () {
          assert.strictEqual(await readFile(item.id, 'utf8'), 'new value');
        });

        it('should set the value property', async function () {
          assert.strictEqual(item.value, 'new value');
        });
      });

      describe('when clearing the item', function () {
        beforeEach(async function () {
          await item.clear();
        });

        it('should remove the item from the filesystem', async function () {
          await assert.rejects(readFile(item.id, 'utf8'), /ENOENT/);
        });

        it('should set the value property to undefined', async function () {
          assert.strictEqual(item.value, undefined);
        });

        describe('when attempting to read it again', function () {
          it('should resolve w/ undefined', async function () {
            assert.strictEqual(await item.read(), undefined);
          });

          it('should set the value property to undefined', async function () {
            assert.strictEqual(item.value, undefined);
          });
        });
      });
    });

    describe('listItems()', function () {
      it('should return an Item for each persisted file with readable contents', async function () {
        await box.createItemWithValue('first', 'a');
        await box.createItemWithValue('second item', 'b');
        const items = await box.listItems();
        assert.deepStrictEqual(
          items.map((i) => i.name).sort(),
          ['first', 'second item'].sort(),
        );
        const byName = Object.fromEntries(items.map((i) => [i.name, i]));
        assert.strictEqual(await byName.first.read(), 'a');
        assert.strictEqual(await byName['second item'].read(), 'b');
      });

      it('should not load persisted contents until read', async function () {
        const name = 'e2e-lazy-list';
        const writer = strongbox(name);
        await rm(writer.container, {recursive: true, force: true});
        await writer.createItemWithValue('key', 'payload');
        const reader = strongbox(name);
        const items = await reader.listItems();
        assert.strictEqual(items.length, 1);
        assert.strictEqual(items[0].value, undefined);
        assert.strictEqual(await items[0].read(), 'payload');
        await rm(writer.container, {recursive: true, force: true});
      });
    });

    describe('Symbol.asyncIterator', function () {
      it('should yield the same Items in the same order as listItems()', async function () {
        await box.createItemWithValue('first', 'a');
        await box.createItemWithValue('second item', 'b');
        const listed = await box.listItems();
        const iterated: typeof listed = [];
        for await (const item of box) {
          iterated.push(item);
        }
        assert.deepStrictEqual(
          iterated.map((i) => i.name),
          listed.map((i) => i.name),
        );
        assert.deepStrictEqual(iterated, listed);
      });
    });

    describe('persistence across Strongbox instances', function () {
      const NAME = 'e2e-persistence-instance';

      beforeEach(async function () {
        await rm(strongbox(NAME).container, {recursive: true, force: true});
      });

      afterEach(async function () {
        await rm(strongbox(NAME).container, {recursive: true, force: true});
      });

      it('should expose persisted items from a second instance with the same identifier', async function () {
        const first = strongbox(NAME);
        await first.createItemWithValue('item-a', 'hello');
        await first.createItemWithValue('item-b', 'world');

        const second = strongbox(NAME);
        assert.strictEqual(second.container, first.container);

        const items = await second.listItems();
        assert.deepStrictEqual(
          items.map((i) => i.name).sort(),
          ['item-a', 'item-b'].sort(),
        );
        const byName = Object.fromEntries(items.map((i) => [i.name, i]));
        assert.strictEqual(await byName['item-a'].read(), 'hello');
        assert.strictEqual(await byName['item-b'].read(), 'world');
      });
    });
  });
});
