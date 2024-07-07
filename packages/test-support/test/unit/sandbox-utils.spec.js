import {withSandbox, verifySandbox} from '../../lib';

let funcs = {
  abc: () => 'abc',
};

describe('sandbox-utils', function () {
  let expect;

  before(async function () {
    const chai = await import('chai');
    chai.should();
    expect = chai.expect;
  });

  describe(
    'withSandbox',
    withSandbox({mocks: {funcs}}, (S) => {
      it('should create a sandbox and mocks', function () {
        expect(S.sandbox).to.exist;
        expect(S.mocks.funcs).to.exist;
        funcs.abc().should.equal('abc');
        S.mocks.funcs.expects('abc').once().returns('efg');
        funcs.abc().should.equal('efg');
        S.sandbox.verify();
      });

      it('should be back to normal', function () {
        funcs.abc().should.equal('abc');
      });

      it('S.verify', function () {
        expect(S.sandbox).to.exist;
        expect(S.mocks.funcs).to.exist;
        S.mocks.funcs.expects('abc').once().returns('efg');
        funcs.abc().should.equal('efg');
        S.verify();
      });

      it('verifySandbox', function () {
        expect(S.sandbox).to.exist;
        expect(S.mocks.funcs).to.exist;
        S.mocks.funcs.expects('abc').once().returns('efg');
        funcs.abc().should.equal('efg');
        verifySandbox(S);
      });
    })
  );
});
