import {util} from '@appium/support';
import sinon from 'sinon';
import {MockStore} from './mock-utils';

/**
 * @template {Record<string, any>} [Mocks=Record<string, any>]
 * @deprecated Use `sinon.createSandbox()` directly instead.
 */
export class SandboxStore {
  /** @type {MockStore<Record<string, any>>|undefined} */
  mocks;

  /** @type {SinonSandbox|undefined} */
  sandbox;

  /**
   * Uses a sandbox if one is provided
   * @param {SinonSandbox} [sandbox]
   */
  constructor(sandbox) {
    this.sandbox = sandbox;
  }

  /**
   * @param {Mocks} mocks
   */
  createSandbox(mocks = /** @type {Mocks} */ ({})) {
    this.sandbox = this.sandbox ?? sinon.createSandbox();
    this.mocks = new MockStore(this.sandbox).createMocks(mocks);
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
    this.mocks?.reset();
    delete this.sandbox;
  }
}

/**
 * @template {Record<string,any>|{mocks: Record<string,any>}} Mocks
 * @deprecated Use `sinon.createSandbox()` directly with Mocha `beforeEach`/`afterEach` hooks instead.
 * @param {Mocks} mockDefs
 * @param {(sandboxStore: SandboxStore<Record<string, any>>) => void} fn
 * @returns {() => void}
 */
export function withSandbox(mockDefs, fn) {
  // backwards-compat
  if (!util.isEmpty(mockDefs.mocks)) {
    mockDefs = mockDefs.mocks;
  }
  return () => {
    /** @type {SandboxStore<Record<string, any>>} */
    const sbx = new SandboxStore();
    // eslint-disable-next-line mocha/no-top-level-hooks
    beforeEach(function beforeEach() {
      sbx.createSandbox(mockDefs);
    });
    // eslint-disable-next-line mocha/no-top-level-hooks
    afterEach(function afterEach() {
      sbx.reset();
    });
    fn(sbx);
  };
}

/**
 * Convenience function for calling {@linkcode SandboxStore.verify}.
 * @deprecated Call `sandbox.verify()` directly on your sinon sandbox instead.
 * @param {SandboxStore<Record<string, any>>|MockStore<Record<string, any>>} sbxOrMocks
 */
export function verifySandbox(sbxOrMocks) {
  sbxOrMocks.verify();
}

/**
 * @typedef {import('sinon').SinonSandbox} SinonSandbox
 */
