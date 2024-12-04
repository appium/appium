# @appium/test-support

> A collection of test utility libs used across Appium packages

[![NPM version](http://img.shields.io/npm/v/@appium/test-support.svg)](https://npmjs.org/package/@appium/test-support)
[![Downloads](http://img.shields.io/npm/dm/@appium/test-support.svg)](https://npmjs.org/package/@appium/test-support)

## Installation

```
npm install @appium/test-support --save-dev
```

## Usage

### withSandbox

Use when mixing up `sinon` APIs (mocks, spies, stubs).

```js
import { withSandbox } from '@appium/test-support';

let api = {
  abc: () => { return 'abc'; }
};

describe('MyTest', withSandbox({mocks: {api}}, (S) => {
  it('stubbing api, stubbing dog', () => {
    S.mocks.api.expects('abc').once().returns('efg');
    let dog = { bark: () => { return 'ouaf!'; } };
    S.sandbox.stub(dog, 'bark').returns('miaou');
    api.abc().should.equal('efg');
    dog.bark().should.equal('miaou');
    S.verify();
  });
}));
```

### withMocks

When using mainly stubs.

```js
import { withMocks } from '@appium/test-support';

let api = {
  abc: () => { return 'abc'; }
};

describe('withMocks', withMocks({api}, (mocks) => {
  it('should mock api', () => {
    mocks.api.expects('abc').once().returns('efg');
    api.abc().should.equal('efg');
    mocks.verify();
  });
}));
```

## License

Apache-2.0
