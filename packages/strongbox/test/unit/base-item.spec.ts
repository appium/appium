import path from 'node:path';
import rewiremock from 'rewiremock/node';
import {createSandbox, SinonSandbox, SinonStubbedMember} from 'sinon';
import type fs from 'node:fs/promises';
import {Item, Strongbox} from '../../lib';

const {expect} = chai;
type MockFs = {
  [K in keyof typeof fs]: SinonStubbedMember<(typeof fs)[K]>;
};

describe('Strongbox', function () {
  let sandbox: SinonSandbox;
  let MockFs: MockFs = {} as any;
  const DATA_DIR = '/some/dir';
  // note to self: looks like this is safe to do before the rewiremock.proxy call
  let BaseItem: typeof import('../../lib/base-item').BaseItem;

  beforeEach(function () {
    sandbox = createSandbox();
    ({BaseItem} = rewiremock.proxy(
      () => require('../../lib'),
      (r) => ({
        // all of these props are async functions
        'node:fs/promises': r
          .mockThrough((prop) => {
            MockFs = {...MockFs, [prop]: sandbox.stub().resolves()};
            return MockFs[prop as keyof typeof fs];
          })
          .dynamic(), // this allows us to change the mock behavior on-the-fly
        'env-paths': sandbox.stub().returns({data: DATA_DIR}),
      })
    ));
  });

  describe('BaseItem', function () {
    describe('constructor', function () {
      it('should set the id property based on the parent container', function () {
        const item = new BaseItem('foo', {container: DATA_DIR} as Strongbox);
        expect(item.id).to.equal(path.join(DATA_DIR, 'foo'));
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
          expect(MockFs.unlink).to.have.been.calledWith(item.id);
        });

        describe('if the item does not exist', function () {
          beforeEach(function () {
            MockFs.unlink.rejects({code: 'ENOENT'});
          });
          it('should not reject', async function () {
            await expect(item.clear()).to.not.be.rejected;
          });
        });

        describe('if something else goes wrong', function () {
          beforeEach(function () {
            MockFs.unlink.rejects(new Error('ugh'));
          });
          it('should reject', async function () {
            await expect(item.clear()).to.be.rejectedWith(Error, 'ugh');
          });
        });
      });

      describe('read()', function () {
        beforeEach(function () {
          MockFs.readFile.resolves('skunk');
        });
        it('should read the item from the fileystem', function () {
          expect(item.read()).to.eventually.equal('skunk');
        });

        it('should set the item value to the read value', async function () {
          await item.read();
          expect(item.value).to.equal('skunk');
        });
      });

      describe('write()', function () {
        beforeEach(async function () {
          await item.write('bar');
        });

        it('should write the new item value to the filesystem', async function () {
          expect(MockFs.writeFile).to.have.been.calledWith(item.id, 'bar');
        });

        it('should create the container', function () {
          expect(MockFs.mkdir).to.have.been.calledWith(path.dirname(item.id), {recursive: true});
        });
      });
    });
  });
});
