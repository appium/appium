import B from 'bluebird';
import sinon from 'sinon';

/**
 * Creates a function which creates Mocha "before each" and "after each" hooks to
 * automatically mock (and un-mock) the mocks provided by `libs`.
 *
 * The values of `libs` are provided directly to {@linkcode SinonSandbox.mock}.
 *
 * _Synchronously_ calls `fn` with the {@linkcode MockStore} after hooks have been created, but not before they have been run.
 *
 * @param {Record<string|symbol,any>} mockDefs
 * @param {(mocks: MockStore) => void} fn
 * @returns {() => void}
 */
export function withMocks(mockDefs, fn) {
  return () => {
    const mocks = new MockStore();
    beforeEach(function withMocksBeforeEach() {
      mocks.createMocks(mockDefs);
    });
    afterEach(function withMocksAfterEach() {
      mocks.reset();
    });
    fn(mocks);
  };
}

/**
 * Convenience function for calling `mocks.verify()`.
 * @param {MockStore} mocks - Returned by callback from {@linkcode withMocks}
 */
export function verifyMocks(mocks) {
  mocks.verify();
}

/**
 * @template {Record<string,any>} Mocks
 * @extends {Mocks}
 */
export class MockStore {
  /**
   * Temporary sandbox; will be `undefined` until `beforeEach` is called
   * @type {SinonSandbox|undefined}
   */
  sandbox;

  /**
   * Original k/v pair provided to `createMocks`
   * @type {Mocks|undefined}
   */
  #mocks;

  /**
   * Uses a sandbox if one is provided
   * @param {SinonSandbox} [sandbox]
   */
  constructor(sandbox) {
    this.sandbox = sandbox;
  }

  /**
   * @param {Mocks} mockDefs
   */
  createMocks(mockDefs) {
    if (this.#mocks) {
      throw new ReferenceError('Cannot create mocks twice; call `reset()` first.');
    }
    this.sandbox = this.sandbox ?? sinon.createSandbox().usingPromise(B);
    for (const [key, value] of Object.entries(mockDefs)) {
      this[key] = this.sandbox.mock(value);
    }
    this.#mocks = mockDefs;
    return this;
  }

  /**
   * Calls {@linkcode SinonSandbox.verify} on the `sandbox` prop, if it exists
   */
  verify() {
    if (!this.sandbox) {
      throw new ReferenceError(
        'Cannot verify mocks before they are created; call `createMocks()` first'
      );
    }
    this.sandbox.verify();
  }

  reset() {
    for (const key of Object.keys(this.#mocks ?? {})) {
      delete this[key];
    }
    this.sandbox?.restore();
    this.#mocks = undefined;
  }
}

/**
 * @typedef {import('sinon').SinonSandbox} SinonSandbox
 */
