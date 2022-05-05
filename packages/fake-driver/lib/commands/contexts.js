import _ from 'lodash';
import {errors} from 'appium/driver';

let commands = {},
  helpers = {},
  extensions = {};

helpers.getRawContexts = function getRawContexts() {
  let contexts = {NATIVE_APP: null, PROXY: null};
  let wvs = this.appModel.getWebviews();
  for (let i = 1; i < wvs.length + 1; i++) {
    contexts[`WEBVIEW_${i}`] = wvs[i - 1];
  }
  return contexts;
};

helpers.assertWebviewContext = function assertWebviewContext() {
  if (this.curContext === 'NATIVE_APP') {
    throw new errors.InvalidContextError();
  }
};

commands.getCurrentContext = async function getCurrentContext() {
  return this.curContext;
};

commands.getContexts = async function getContexts() {
  return _.keys(this.getRawContexts());
};

commands.setContext = async function setContext(context) {
  let contexts = this.getRawContexts();
  if (_.includes(_.keys(contexts), context)) {
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
};

commands.setFrame = async function setFrame(frameId) {
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
};

Object.assign(extensions, commands, helpers);
export {commands, helpers};
export default extensions;
