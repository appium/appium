import path from 'node:path';
import rewiremock from 'rewiremock/node';
import type {Strongbox as TStrongbox, StrongboxOpts} from '../../lib';
import {createSandbox, SinonSandbox, SinonStubbedMember} from 'sinon';
import type fs from 'node:fs/promises';

const {expect} = chai;
type MockFs = {
  [K in keyof typeof fs]: SinonStubbedMember<(typeof fs)[K]>;
};

describe('Strongbox', function () {
  let strongbox: (name: string, opts?: StrongboxOpts) => TStrongbox;
  let Strongbox: new (name: string, opts?: StrongboxOpts) => TStrongbox;
  let sandbox: SinonSandbox;
  let DEFAULT_SUFFIX: string;
  let MockFs: MockFs = {} as any;

  const DATA_DIR = '/some/dir';

  beforeEach(function () {
    sandbox = createSandbox();
    ({strongbox, DEFAULT_SUFFIX, Strongbox} = rewiremock.proxy(() => require('../../lib'), (r) => ({
      // all of these props are async functions
      'node:fs/promises': r
        .mockThrough((prop) => {
          MockFs = {...MockFs, [prop]: sandbox.stub().resolves()};
          return MockFs[prop as keyof typeof fs];
        })
        .dynamic(), // this allows us to change the mock behavior on-the-fly
      'env-paths': sandbox.stub().returns({data: DATA_DIR}),
    })));
  });

  describe('static method', function () {
    describe('create()', function () {
      it('should return a new Strongbox', function () {
        const box = strongbox('test');
        expect(box).to.be.an.instanceOf(Strongbox);
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
          it('should create an empty Item', async function () {
            const item = await box.createItem('SLUG test');
            expect(item).to.eql({
              id: '/some/dir/strongbox/slug-test',
              name: 'SLUG test',
              encoding: 'utf8',
              value: undefined,
              container: '/some/dir/strongbox',
            });
          });
        });

        describe('when the file exists', function () {
          beforeEach(function () {
            MockFs.readFile.resolves('foo bar');
          });
          it('should read its value', async function () {
            const item = await box.createItem('SLUG test');
            expect(item).to.eql({
              id: '/some/dir/strongbox/slug-test',
              name: 'SLUG test',
              encoding: 'utf8',
              value: 'foo bar',
              container: '/some/dir/strongbox',
            });
          });
        });

        describe('when a value is written to the Item', function () {
          it('should write a string value to the underlying file', async function () {
            const item = await box.createItem('test');
            await item.write('boo bah');

            expect(MockFs.writeFile).to.have.been.calledWith(
              path.join(DATA_DIR, DEFAULT_SUFFIX, 'test'),
              'boo bah',
              'utf8'
            );
          });

          it('should update the underlying value', async function () {
            const item = await box.createItem('test');
            await item.write('boo bah');
            expect(item.value).to.equal('boo bah');
          });
        });
      });

      describe('when a Item with the same id already exists', function () {
        it('should throw an error', async function () {
          await box.createItem('test');
          await expect(box.createItem('test')).to.be.rejectedWith(
            Error,
            'Item with id "/some/dir/strongbox/test" already exists'
          );
        });
      });
    });

    describe('clearAll()', function () {
      let clear: sinon.SinonStub<never[], Promise<void>>;

      beforeEach(async function () {
        const item = await box.createItem<string>('SLUG test');
        clear = sandbox.stub(item, 'clear');
      });

      it('should call clear() on each item', async function () {
        await box.clearAll();
        expect(clear).to.have.been.calledOnce;
      });

      describe('when there is some other error', function () {
        beforeEach(function () {
          clear.rejects(new Error('ETOOMANYGOATS'));
        });

        it('should reject', async function () {
          await expect(box.clearAll()).to.be.rejected;
        });
      });
    });

    describe('createItemWithValue()', function () {
      it('should create a Item with the given value', async function () {
        const item = await box.createItemWithValue('test', 'value');
        expect(item.value).to.equal('value');
      });

      it('should write the value to disk', async function () {
        await box.createItemWithValue('test', 'value');
        expect(MockFs.writeFile).to.have.been.calledWith(
          path.join(DATA_DIR, DEFAULT_SUFFIX, 'test'),
          'value'
        );
      });
    });
  });

  afterEach(function () {
    sandbox.restore();
  });
});
