import {readFile, rm} from 'node:fs/promises';
import type {Item, Strongbox} from '../../lib';
import {strongbox} from '../../lib';

describe('@appium/strongbox', function () {
  let expect: any;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;
  });

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
        await expect(readFile(item.id, 'utf8')).to.eventually.equal('value');
      });

      it('should set the value property', async function () {
        expect(item.value).to.equal('value');
      });

      describe('when writing a new value', function () {
        beforeEach(async function () {
          await item.write('new value');
        });

        it('should write the value to the filesystem', async function () {
          await expect(readFile(item.id, 'utf8')).to.eventually.equal('new value');
        });

        it('should set the value property', async function () {
          expect(item.value).to.equal('new value');
        });
      });

      describe('when clearing the item', function () {
        beforeEach(async function () {
          await item.clear();
        });

        it('should remove the item from the filesystem', async function () {
          await expect(readFile(item.id, 'utf8')).to.be.rejectedWith('ENOENT');
        });

        it('should set the value property to undefined', async function () {
          expect(item.value).to.be.undefined;
        });

        describe('when attempting to read it again', function () {
          it('should resolve w/ undefined', async function () {
            await expect(item.read()).to.eventually.be.undefined;
          });

          it('should set the value property to undefined', async function () {
            expect(item.value).to.be.undefined;
          });
        });
      });
    });

    describe('listItems()', function () {
      it('should return Items for persisted files in directory order', async function () {
        await box.createItemWithValue('first', 'a');
        await box.createItemWithValue('second item', 'b');
        const items = await box.listItems();
        expect(items.map((i) => i.name).sort()).to.eql(['first', 'second item']);
        const byName = Object.fromEntries(items.map((i) => [i.name, i]));
        await expect(byName.first.read()).to.eventually.equal('a');
        await expect(byName['second item'].read()).to.eventually.equal('b');
      });

      it('should not load persisted contents until read', async function () {
        const name = 'e2e-lazy-list';
        const writer = strongbox(name);
        await rm(writer.container, {recursive: true, force: true});
        await writer.createItemWithValue('key', 'payload');
        const reader = strongbox(name);
        const items = await reader.listItems();
        expect(items).to.have.length(1);
        expect(items[0].value).to.be.undefined;
        await expect(items[0].read()).to.eventually.equal('payload');
        await rm(writer.container, {recursive: true, force: true});
      });
    });

    describe('Symbol.asyncIterator', function () {
      it('should match listItems order and contents', async function () {
        await box.createItemWithValue('first', 'a');
        await box.createItemWithValue('second item', 'b');
        const listed = await box.listItems();
        const iterated: typeof listed = [];
        for await (const item of box) {
          iterated.push(item);
        }
        expect(iterated.map((i) => i.name)).to.eql(listed.map((i) => i.name));
        expect(iterated).to.eql(listed);
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
        expect(second.container).to.equal(first.container);

        const items = await second.listItems();
        expect(items.map((i) => i.name).sort()).to.eql(['item-a', 'item-b']);
        const byName = Object.fromEntries(items.map((i) => [i.name, i]));
        await expect(byName['item-a'].read()).to.eventually.equal('hello');
        await expect(byName['item-b'].read()).to.eventually.equal('world');
      });
    });
  });
});
