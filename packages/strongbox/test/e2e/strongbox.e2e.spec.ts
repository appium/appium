import {readFile} from 'node:fs/promises';
import type {Item, Strongbox} from '../../lib';
import { strongbox} from '../../lib';

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
      await box.clearAll(true);
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
  });
});
