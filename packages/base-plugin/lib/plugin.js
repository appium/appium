import {logger} from '@appium/support';

/**
 * @implements {Plugin}
 */
class BasePlugin {
  /**
   * Subclasses should use type `import('@appium/types').MethodMap<SubclassName>`.
   *
   * This will verify that the commands in the `newMethodMap` property are
   * valid.  It is impossible to use a generic type param here; the type of this should really
   * be something like `MethodMap<T extends BasePlugin>` but that isn't a thing TS does.
   *
   * ```ts
   * static newMethodMap = {
   *   '/session/:sessionId/fake_data': {
   *     GET: {command: 'getFakeSessionData', neverProxy: true},
   *   }
   * } as const;
   * ```
   */
  static newMethodMap = {};

  /**
   * @param {string} name
   * @param {Record<string,unknown>} [cliArgs]
   */
  constructor(name, cliArgs = {}) {
    this.name = name;
    this.cliArgs = cliArgs;
    this.logger = logger.getLogger(`Plugin [${name}]`);
  }
}

export default BasePlugin;
export {BasePlugin};

/**
 * @typedef {import('@appium/types').Plugin} Plugin
 */
