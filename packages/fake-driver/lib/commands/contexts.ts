import _ from 'lodash';
import type {Document as XMLDocument} from '@xmldom/xmldom';
import type {FakeDriver} from '../driver';
import type {FakeWebView} from '../fake-app';
import {errors} from 'appium/driver';

/** NATIVE_APP, PROXY, and WEBVIEW_1, WEBVIEW_2, ... from app model. */
export function getRawContexts(this: FakeDriver): Record<string, unknown> {
  const contexts: Record<string, unknown> = {NATIVE_APP: null, PROXY: null};
  const wvs = this.appModel.getWebviews() ?? [];
  for (let i = 1; i < wvs.length + 1; i++) {
    contexts[`WEBVIEW_${i}`] = wvs[i - 1];
  }
  return contexts;
}

/** Throw if current context is NATIVE_APP (e.g. CSS/title require a webview). */
export function assertWebviewContext(this: FakeDriver): void {
  if (this.curContext === 'NATIVE_APP') {
    throw new errors.InvalidContextError();
  }
}

/** getCurrentContext. */
export async function getCurrentContext(this: FakeDriver): Promise<string> {
  return this.curContext;
}

/** getContexts. */
export async function getContexts(this: FakeDriver): Promise<string[]> {
  return _.keys(this.getRawContexts());
}

/** setContext. */
export async function setContext(this: FakeDriver, context: string): Promise<void> {
  const contexts = this.getRawContexts();
  if (context in contexts) {
    this.curContext = context;
    if (context === 'NATIVE_APP') {
      this.appModel.deactivateWebview();
      this._proxyActive = false;
    } else if (context === 'PROXY') {
      this._proxyActive = true;
    } else {
      this.appModel.activateWebview(contexts[context] as FakeWebView);
      this._proxyActive = false;
    }
  } else {
    throw new errors.NoSuchContextError();
  }
}

/** setFrame. */
export async function setFrame(this: FakeDriver, frameId: number | null): Promise<void> {
  this.assertWebviewContext();
  if (frameId === null) {
    this.appModel.deactivateFrame();
  } else {
    const nodes = this.appModel.xpathQuery(`//iframe[@id="${frameId}"]`);
    if (!_.isArray(nodes) || _.isEmpty(nodes)) {
      throw new errors.NoSuchFrameError();
    }
    this.appModel.activateFrame(nodes[0] as XMLDocument);
  }
}
