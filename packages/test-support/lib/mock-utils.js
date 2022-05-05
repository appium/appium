import sinon from 'sinon';
import _ from 'lodash';

let SANDBOX = Symbol();

function withMocks(libs, fn) {
  return () => {
    const mocks = {
      verify() {
        this.sandbox.verify();
      },
      get sandbox() {
        return this[SANDBOX];
      },
      set sandbox(sandbox) {
        this[SANDBOX] = sandbox;
      },
    };
    beforeEach(function beforeEach() {
      mocks[SANDBOX] = sinon.createSandbox();
      for (let [key, value] of _.toPairs(libs)) {
        mocks[key] = mocks.sandbox.mock(value);
      }
    });
    afterEach(function afterEach() {
      mocks.sandbox.restore();
    });
    fn(mocks);
  };
}

function verifyMocks(mocks) {
  mocks.sandbox.verify();
}

export {withMocks, verifyMocks};
