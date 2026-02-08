import {fs} from 'appium/support';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import XMLDom from '@xmldom/xmldom';
import * as xpath from 'xpath';
import log from './logger';
import _ from 'lodash';
import {FakeElement, type XmlNodeLike} from './fake-element';
import type {Location} from '@appium/types';
import type {Orientation} from '@appium/types';

const SCREENSHOT = path.join(__dirname, 'screen.png');

/** Document type from @xmldom/xmldom (avoids conflict with DOM lib) */
type XMLDocument = import('@xmldom/xmldom').Document;

interface FakeWebView {
  node: XmlNodeLike;
}

export class FakeApp {
  dom: XMLDocument | null;
  activeDom: XMLDocument | null;
  activeWebview: FakeWebView | null;
  activeFrame: XMLDocument | null;
  activeAlert: FakeElement | null;
  lat: number;
  long: number;
  _width: number | null;
  _height: number | null;
  rawXml: string;
  currentOrientation: Orientation;
  actionLog: import('@appium/types').ActionSequence[][];

  constructor() {
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

  get title(): string {
    const nodes = this.xpathQuery('//title');
    if (!_.isArray(nodes) || nodes.length < 1) {
      throw new Error('No title!');
    }
    const node = nodes[0];
    const firstChild = node.firstChild as unknown as {data: string} | null;
    return firstChild?.data ?? '';
  }

  get currentGeoLocation(): Location {
    return {
      latitude: this.lat,
      longitude: this.long,
    };
  }

  get orientation(): Orientation {
    return this.currentOrientation;
  }

  set orientation(o: Orientation) {
    this.currentOrientation = o;
  }

  get width(): number {
    if (this._width === null) {
      this.setDims();
    }
    return this._width!;
  }

  get height(): number {
    if (this._width === null) {
      this.setDims();
    }
    return this._height!;
  }

  setDims(): void {
    const nodes = this.xpathQuery('//app');
    if (!_.isArray(nodes)) {
      throw new Error(
        'Cannot fetch app dimensions because no corresponding node has benn found in the source'
      );
    }
    const app = new FakeElement(nodes[0] as unknown as XmlNodeLike, this);
    this._width = parseInt(app.nodeAttrs.width, 10);
    this._height = parseInt(app.nodeAttrs.height, 10);
  }

  async loadApp(appPath: string): Promise<void> {
    log.info(`Loading Mock app model at ${appPath}`);
    const data = await fs.readFile(appPath);
    log.info('Parsing Mock app XML');
    this.rawXml = data.toString();
    this.rawXml = this.rawXml.replace('<app ', '<AppiumAUT><app ');
    this.rawXml = this.rawXml.replace('<app>', '<AppiumAUT><app>');
    this.rawXml = this.rawXml.replace('</app>', '</app></AppiumAUT>');
    this.dom = new XMLDom.DOMParser().parseFromString(
      this.rawXml,
      XMLDom.MIME_TYPE.XML_TEXT
    ) as XMLDocument;
    this.activeDom = this.dom;
  }

  getWebviews(): FakeWebView[] {
    const nodes = this.xpathQuery('//MockWebView/*[1]');
    return _.isArray(nodes) ? nodes.map((n) => new FakeWebView(n as unknown as XmlNodeLike)) : [];
  }

  activateWebview(wv: FakeWebView): void {
    this.activeWebview = wv;
    const fragment = new XMLDom.XMLSerializer().serializeToString(
      wv.node as unknown as import('@xmldom/xmldom').Node
    );
    this.activeDom = new XMLDom.DOMParser().parseFromString(
      fragment,
      XMLDom.MIME_TYPE.XML_TEXT
    ) as XMLDocument;
  }

  deactivateWebview(): void {
    this.activeWebview = null;
    this.activeDom = this.dom;
  }

  activateFrame(frame: XMLDocument): void {
    this.activeFrame = frame;
    const fragment = new XMLDom.XMLSerializer().serializeToString(
      frame as unknown as import('@xmldom/xmldom').Node
    );
    this.activeDom = new XMLDom.DOMParser().parseFromString(
      fragment,
      XMLDom.MIME_TYPE.XML_TEXT
    ) as XMLDocument;
  }

  deactivateFrame(): void {
    this.activeFrame = null;
    if (this.activeWebview) {
      this.activateWebview(this.activeWebview);
    }
  }

  xpathQuery(sel: string, ctx?: XMLDocument | null): xpath.SelectedValue {
    const node = ctx ?? this.activeDom;
    return xpath.select(
      sel,
      node as unknown as Node
    ) as xpath.SelectedValue;
  }

  idQuery(id: string, ctx?: XMLDocument | null): xpath.SelectedValue {
    return this.xpathQuery(`//*[@id="${id}"]`, ctx);
  }

  classQuery(className: string, ctx?: XMLDocument | null): xpath.SelectedValue {
    return this.xpathQuery(`//${className}`, ctx);
  }

  cssQuery(css: string, ctx?: XMLDocument | null): xpath.SelectedValue {
    if (css.startsWith('#')) {
      return this.idQuery(css.slice(1), ctx);
    }
    if (css.startsWith('.')) {
      return this.classQuery(css.slice(1), ctx);
    }
    return this.classQuery(css, ctx);
  }

  hasAlert(): boolean {
    return this.activeAlert !== null;
  }

  setAlertText(text: string): void {
    if (!this.activeAlert?.hasPrompt()) {
      throw new Error('No prompt to set text of');
    }
    this.activeAlert?.setAttr('prompt', text);
  }

  showAlert(alertId: string): void {
    const nodes = this.xpathQuery(`//alert[@id="${alertId}"]`);
    if (!_.isArray(nodes) || _.isEmpty(nodes)) {
      throw new Error(`Alert ${alertId} doesn't exist!`);
    }
    this.activeAlert = new FakeElement(nodes[0] as unknown as XmlNodeLike, this);
  }

  alertText(): string {
    return (this.activeAlert?.getAttr('prompt') ?? this.activeAlert?.nodeAttrs?.text) ?? '';
  }

  handleAlert(): void {
    this.activeAlert = null;
  }

  getScreenshot(): string {
    return readFileSync(SCREENSHOT, 'base64');
  }
}

class FakeWebView implements FakeWebView {
  node: XmlNodeLike;
  constructor(node: XmlNodeLike) {
    this.node = node;
  }
}
