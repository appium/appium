import _ from 'lodash';
import type {Document as XMLDocument} from '@xmldom/xmldom';
import type {FakeDriver} from '../driver';
import type {FakeWebView} from '../fake-app';
import {errors} from 'appium/driver';

export function getRawContexts(this: FakeDriver): Record<string, unknown> {
  const contexts: Record<string, unknown> = {NATIVE_APP: null, PROXY: null};
  const wvs = this.appModel.getWebviews() ?? [];
  for (let i = 1; i < wvs.length + 1; i++) {
    contexts[`WEBVIEW_${i}`] = wvs[i - 1];
  }
  return contexts;
}

export function assertWebviewContext(this: FakeDriver): void {
  if (this.curContext === 'NATIVE_APP') {
    throw new errors.InvalidContextError();
  }
}

export async function getCurrentContext(this: FakeDriver): Promise<string> {
  return this.curContext;
}

export async function getContexts(this: FakeDriver): Promise<string[]> {
  return _.keys(this.getRawContexts());
}

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

export async function setFrame(this: FakeDriver, frameId: number | null): Promise<void> {
  assertWebviewContext.call(this);
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
