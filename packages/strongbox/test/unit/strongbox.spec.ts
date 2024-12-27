import path from 'node:path';
import rewiremock from 'rewiremock/node';
import type {Strongbox as TStrongbox, StrongboxOpts, Item, Value} from '../../lib';
import {
  // eslint-disable-next-line import/named
  createSandbox,
  SinonSandbox,
  SinonStubbedMember,
  SinonStub
} from 'sinon';
import type fs from 'node:fs/promises';

type MockFs = {
  [K in keyof typeof fs]: SinonStubbedMember<(typeof fs)[K]>;
};

describe('Strongbox', function () {
  let strongbox: (name: string, opts?: Partial<StrongboxOpts>) => TStrongbox;
  let Strongbox: new (name: string, opts?: StrongboxOpts) => TStrongbox;
  let sandbox: SinonSandbox;
  let DEFAULT_SUFFIX: string;
  let MockFs: MockFs = {} as any;
  let expect: any;

  const DATA_DIR = path.resolve('some', 'dir', 'strongbox');

  before(async function () {
    const chai = await import('chai');
    chai.should();
    expect = chai.expect;
  });

  beforeEach(function () {
    sandbox = createSandbox();
    ({strongbox, DEFAULT_SUFFIX, Strongbox} = rewiremock.proxy(
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

  describe('static method', function () {
    describe('create()', function () {
      it('should return a new Strongbox', function () {
        const box = strongbox('test');
        expect(box).to.be.an.instanceOf(Strongbox);
      });

      describe('when provided an absolute container path', function () {
        it('should use the provided container path', function () {
          const container = path.resolve(path.sep, 'somewhere');
          expect(strongbox('test', {container}).container).to.equal(container);
        });
      });

      describe('when provided a relative container path', function () {
        it('should throw an error', function () {
          const container = path.join('somewhere', 'else');

          expect(() => strongbox('test', {container})).to.throw(
            TypeError,
            `container slug ${container} must be an absolute path`
          );
        });
      });

      describe('when provided a suffix', function () {
        it('should use the provided suffix', function () {
          expect(strongbox('test', {suffix: 'mooo'}).suffix).to.equal('mooo');
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
            expect(item).to.eql({
              id: path.resolve(DATA_DIR, 'strongbox', 'SLUG-test'),
              name: 'SLUG test',
              encoding: 'utf8',
              value: undefined,
              container: path.resolve(DATA_DIR, 'strongbox'),
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
              id: path.resolve(DATA_DIR, 'strongbox', 'SLUG-test'),
              name: 'SLUG test',
              encoding: 'utf8',
              value: 'foo bar',
              container: path.resolve(DATA_DIR, 'strongbox'),
            });
          });
        });

        describe('when attempting to read the file throws a non-ENOENT error', function () {
          beforeEach(function () {
            MockFs.readFile.rejects(new Error('ETOOMANYGOATS'));
          });
          it('should reject', async function () {
            await expect(box.createItem('SLUG test')).to.be.rejectedWith(Error, 'ETOOMANYGOATS');
          });
        });

        describe('when a value is written to the Item', function () {
          it('should write a string value to the underlying file', async function () {
            const item = await box.createItem('test');
            await item.write('boo bah');

            MockFs.writeFile.calledWith(
              path.resolve(DATA_DIR, DEFAULT_SUFFIX, 'test'),
              'boo bah',
              'utf8'
            ).should.be.true;
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
            `Item with id "${path.resolve(DATA_DIR, 'strongbox', 'test')}" already exists`
          );
        });
      });

      describe('when the second parameter is a valid encoding', function () {
        it('should create the empty Item with the proper encoding', async function () {
          const item = await box.createItem('test', 'base64');
          expect(item.encoding).to.equal('base64');
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
        clear.calledOnce.should.be.true;
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
        MockFs.writeFile.calledWith(
          path.resolve(DATA_DIR, DEFAULT_SUFFIX, 'test'),
          'value'
        ).should.be.true;
      });

      describe('when the third parameter is a valid encoding', function () {
        it('should create the Item with the given value and proper encoding', async function () {
          const item = await box.createItemWithValue('test', 'value', 'base64');
          expect(item.encoding).to.equal('base64');
        });
      });
    });

    describe('getItem()', function () {
      describe('when there is no known Item with the given id', function () {
        it('should return undefined', function () {
          expect(box.getItem('test')).to.be.undefined;
        });
      });

      describe('when there is a known Item with the given id', function () {
        it('should return the Item', async function () {
          const item = await box.createItem('test');
          expect(box.getItem(item.id)).to.equal(item);
        });
      });
    });
  });

  afterEach(function () {
    sandbox.restore();
  });
});
