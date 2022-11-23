import _ from 'lodash';
import {errors} from 'appium/driver';

/**
 *
 * @template {Class<import('../types').IFakeDriver>} T
 * @param {T} Base
 */
export function ContextsMixin(Base) {
  /**
   * @implements {IContextsCommands}
   */
  class ContextsCommands extends Base {
    getRawContexts() {
      let contexts = {NATIVE_APP: null, PROXY: null};
      let wvs = this.appModel?.getWebviews() ?? [];
      for (let i = 1; i < wvs.length + 1; i++) {
        contexts[`WEBVIEW_${i}`] = wvs[i - 1];
      }
      return contexts;
    }

    assertWebviewContext() {
      if (this.curContext === 'NATIVE_APP') {
        throw new errors.InvalidContextError();
      }
    }

    /**
     * Get the current appium context
     *
     * @returns {Promise<string>}
     */
    async getCurrentContext() {
      return this.curContext;
    }

    /**
     * Get the list of available contexts
     *
     * @returns {Promise<string[]>}
     */
    async getContexts() {
      return _.keys(this.getRawContexts());
    }

    /**
     * Set the current context
     *
     * @param {string} context - name of the context
     * @returns {Promise<void>}
     */
    async setContext(context) {
      let contexts = this.getRawContexts();
      if (context in contexts) {
        this.curContext = context;
        if (context === 'NATIVE_APP') {
          this.appModel.deactivateWebview();
          this._proxyActive = false;
        } else if (context === 'PROXY') {
          this._proxyActive = true;
        } else {
          this.appModel.activateWebview(contexts[context]);
          this._proxyActive = false;
        }
      } else {
        throw new errors.NoSuchContextError();
      }
    }

    /**
     * Set the active frame
     *
     * @param {number} frameId
     * @returns {Promise<void>}
     */
    async setFrame(frameId) {
      this.assertWebviewContext();
      if (frameId === null) {
        this.appModel.deactivateFrame();
      } else {
        let nodes = this.appModel.xpathQuery(`//iframe[@id="${frameId}"]`);
        if (!nodes.length) {
          throw new errors.NoSuchFrameError();
        }
        this.appModel.activateFrame(nodes[0]);
      }
    }
  }

  return ContextsCommands;
}

/**
 * @typedef {import('../driver').FakeDriverCore} FakeDriverCore
 * @typedef {import('../types').IContextsCommands} IContextsCommands
 */

/**
 * @template T,[U={}],[V=Array<any>]
 * @typedef {import('@appium/types').Class<T,U,V>} Class
 */
