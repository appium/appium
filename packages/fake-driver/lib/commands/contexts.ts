import _ from 'lodash';
import {FakeDriver} from '../driver';
import {errors} from 'appium/driver';
import {mixin} from './mixin';
interface FakeDriverContextsMixin {
  getRawContexts(): Record<string, any>;
  assertWebviewContext(): void;
  getCurrentContext(): Promise<string>;
  getContexts(): Promise<string[]>;
  setContext(context: string): Promise<void>;
  setFrame(frame: number | null): Promise<void>;
}
declare module '../driver' {
  interface FakeDriver extends FakeDriverContextsMixin {}
}

const ContextsMixin: FakeDriverContextsMixin = {
  getRawContexts(this: FakeDriver) {
    const contexts = {NATIVE_APP: null, PROXY: null};
    const wvs = this.appModel.getWebviews() ?? [];
    for (let i = 1; i < wvs.length + 1; i++) {
      contexts[`WEBVIEW_${i}`] = wvs[i - 1];
    }
    return contexts;
  },

  assertWebviewContext(this: FakeDriver) {
    if (this.curContext === 'NATIVE_APP') {
      throw new errors.InvalidContextError();
    }
  },

  async getCurrentContext(this: FakeDriver): Promise<string> {
    return this.curContext;
  },

  /**
   * Get the list of available contexts
   */
  async getContexts(this: FakeDriver) {
    return _.keys(this.getRawContexts());
  },

  /**
   * Set the current context
   *
   * @param context - name of the context
   */
  async setContext(this: FakeDriver, context: string) {
    const contexts = this.getRawContexts();
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
  },

  /**
   * Set the active frame
   */
  async setFrame(this: FakeDriver, frameId: number | null) {
    this.assertWebviewContext();
    if (frameId === null) {
      this.appModel.deactivateFrame();
    } else {
      const nodes = this.appModel.xpathQuery(`//iframe[@id="${frameId}"]`);
      if (!nodes.length) {
        throw new errors.NoSuchFrameError();
      }
      this.appModel.activateFrame(nodes[0]);
    }
  },
};

mixin(ContextsMixin);
