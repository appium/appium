import _ from 'lodash';
import XMLDom from '@xmldom/xmldom';
import type {Document as XMLDocument, Node as XMLNode} from '@xmldom/xmldom';
import type {FakeApp} from './fake-app';

export interface XmlNodeLike {
  tagName: string;
  attributes: {name: string; value: string}[];
}

/** Wrapper around an XML node from the fake app DOM; supports attrs, css, visibility, click, alerts. */
export class FakeElement {
  readonly app: FakeApp;
  readonly type: string;
  readonly nodeAttrs: Record<string, string>;
  readonly node: XmlNodeLike;
  attrs: Record<string, string>;
  css: Record<string, string>;

  constructor(xmlNode: XmlNodeLike, app: FakeApp) {
    this.app = app;
    this.node = xmlNode;
    this.nodeAttrs = {};
    this.type = xmlNode.tagName;
    this.attrs = {};
    this.css = {};
    // Support both DOM Attr (name/value) and nodeName/nodeValue (e.g. @xmldom/xmldom).
    const attrs = this.node.attributes as unknown as Array<{
      name?: string; nodeName?: string; value?: string; nodeValue?: string
    }>;
    for (const attr of _.values(attrs)) {
      const name = attr.name ?? attr.nodeName ?? '';
      const value = attr.value ?? attr.nodeValue ?? '';
      if (name) {
        this.nodeAttrs[name] = value;
      }
    }
    this.parseCss();
  }

  private parseCss(): void {
    if (this.nodeAttrs.style) {
      const segments = this.nodeAttrs.style.split(';');
      for (const s of segments) {
        let [prop, val] = s.split(':');
        prop = prop.trim();
        val = val.trim();
        this.css[prop] = val;
      }
    }
  }

  get tagName(): string {
    return this.node.tagName;
  }

  setAttr(k: string, v: string): void {
    this.attrs[k] = v;
  }

  getAttr(k: string): string {
    return this.attrs[k] || '';
  }

  isVisible(): boolean {
    return this.nodeAttrs.visible !== 'false';
  }

  isEnabled(): boolean {
    return this.nodeAttrs.enabled !== 'false';
  }

  isSelected(): boolean {
    return this.nodeAttrs.selected === 'true';
  }

  getLocation(): {x: number; y: number} {
    return {
      x: parseFloat(this.nodeAttrs.left || '0'),
      y: parseFloat(this.nodeAttrs.top || '0'),
    };
  }

  getElementRect(): {x: number; y: number; width: number; height: number} {
    return {...this.getLocation(), ...this.getSize()};
  }

  getSize(): {width: number; height: number} {
    return {
      width: parseFloat(this.nodeAttrs.width || '0'),
      height: parseFloat(this.nodeAttrs.height || '0'),
    };
  }

  click(): void {
    const curClicks = Number(this.getAttr('clicks') || 0);
    this.setAttr('clicks', String(curClicks + 1));
    const alertId = this.nodeAttrs.showAlert;
    if (alertId) {
      this.app.showAlert(alertId);
    }
  }

  equals(other: FakeElement): boolean {
    return this.node === other.node;
  }

  hasPrompt(): boolean {
    return this.nodeAttrs.hasPrompt === 'true';
  }

  getCss(prop: string): string | null {
    if (_.has(this.css, prop)) {
      return this.css[prop];
    }
    return null;
  }

  get xmlFragment(): XMLDocument {
    const frag = new XMLDom.XMLSerializer().serializeToString(
      this.node as unknown as XMLNode
    );
    return new XMLDom.DOMParser().parseFromString(
      frag,
      XMLDom.MIME_TYPE.XML_TEXT
    ) as XMLDocument;
  }
}
