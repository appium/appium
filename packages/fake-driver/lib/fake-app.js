import {fs} from '@appium/support';
import {readFileSync, existsSync} from 'fs';
import path from 'path';
import XMLDom from 'xmldom';
import xpath from 'xpath';
import log from './logger';
import { FakeElement } from './fake-element';

const screenShotPath = path.join(__dirname, '..', 'screen.png');
const SCREENSHOT = existsSync(screenShotPath) ? screenShotPath : path.join(__dirname, '..', '..', 'screen.png');

class FakeApp {
  constructor () {
    this.dom = null;
    this.activeDom = null;
    this.activeWebview = null;
    this.activeFrame = null;
    this.activeAlert = null;
    this.lat = 0;
    this.long = 0;
    this._width = null;
    this._height = null;
    this.rawXml = '';
    this.currentOrientation = 'PORTRAIT';
    this.actionLog = [];
  }

  get title () {
    let nodes = this.xpathQuery('//title');
    if (nodes.length < 1) {
      throw new Error('No title!');
    }
    return nodes[0].firstChild.data;
  }

  get currentGeoLocation () {
    return {
      latitude: this.lat,
      longitude: this.long
    };
  }

  get orientation () {
    return this.currentOrientation;
  }

  set orientation (o) {
    this.currentOrientation = o;
  }

  get width () {
    if (this._width === null) {
      this.setDims();
    }
    return this._width;
  }

  get height () {
    if (this._width === null) {
      this.setDims();
    }
    return this._width;
  }

  setDims () {
    const nodes = this.xpathQuery('//app');
    const app = new FakeElement(nodes[0], this);
    this._width = parseInt(app.nodeAttrs.width, 10);
    this._height = parseInt(app.nodeAttrs.height, 10);
  }

  async loadApp (appPath) {
    log.info(`Loading Mock app model at ${appPath}`);
    let data = await fs.readFile(appPath);
    log.info('Parsing Mock app XML');
    this.rawXml = data.toString();
    this.rawXml = this.rawXml.replace('<app ', '<AppiumAUT><app ');
    this.rawXml = this.rawXml.replace('<app>', '<AppiumAUT><app>');
    this.rawXml = this.rawXml.replace('</app>', '</app></AppiumAUT>');
    this.dom = new XMLDom.DOMParser().parseFromString(this.rawXml);
    this.activeDom = this.dom;
  }

  getWebviews () {
    return this.xpathQuery('//MockWebView/*[1]').map((n) => new FakeWebView(n));
  }

  activateWebview (wv) {
    this.activeWebview = wv;
    let fragment = new XMLDom.XMLSerializer().serializeToString(wv.node);
    this.activeDom = new XMLDom.DOMParser().parseFromString(fragment,
        'application/xml');
  }

  deactivateWebview () {
    this.activeWebview = null;
    this.activeDom = this.dom;
  }

  activateFrame (frame) {
    this.activeFrame = frame;
    let fragment = new XMLDom.XMLSerializer().serializeToString(frame);
    this.activeDom = new XMLDom.DOMParser().parseFromString(fragment,
        'application/xml');
  }

  deactivateFrame () {
    this.activeFrame = null;
    this.activateWebview(this.activeWebview);
  }

  xpathQuery (sel, ctx) {
    return xpath.select(sel, ctx || this.activeDom);
  }

  idQuery (id, ctx) {
    return this.xpathQuery(`//*[@id="${id}"]`, ctx);
  }

  classQuery (className, ctx) {
    return this.xpathQuery(`//${className}`, ctx);
  }

  cssQuery (css, ctx) {
    if (css.startsWith('#')) {
      return this.idQuery(css.slice(1), ctx);
    }
    if (css.startsWith('.')) {
      return this.classQuery(css.slice(1), ctx);
    }
    return this.classQuery(css, ctx);
  }

  hasAlert () {
    return this.activeAlert !== null;
  }

  setAlertText (text) {
    if (!this.activeAlert.hasPrompt()) {
      throw new Error('No prompt to set text of');
    }
    this.activeAlert.setAttr('prompt', text);
  }

  showAlert (alertId) {
    let nodes = this.xpathQuery(`//alert[@id="${alertId}"]`);
    if (nodes.length < 1) {
      throw new Error(`Alert ${alertId} doesn't exist!`);
    }
    this.activeAlert = new FakeElement(nodes[0], this);
  }

  alertText () {
    return this.activeAlert.getAttr('prompt') ||
           this.activeAlert.nodeAttrs.text;
  }

  handleAlert () {
    this.activeAlert = null;
  }

  getScreenshot () {
    return readFileSync(SCREENSHOT, 'base64');
  }

}

class FakeWebView {
  constructor (node) {
    this.node = node;
  }
}

export { FakeApp };
