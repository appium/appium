import _ from 'lodash';
import XMLDom from 'xmldom';

class FakeElement {
  constructor (xmlNode, app) {
    this.app = app;
    this.node = xmlNode;
    this.nodeAttrs = {};
    this.type = this.node.tagName;
    this.attrs = {};
    this.css = {};
    for (let {name, value} of _.values(this.node.attributes)) {
      this.nodeAttrs[name] = value;
    }
    this.parseCss();
  }

  parseCss () {
    if (this.nodeAttrs.style) {
      let segments = this.nodeAttrs.style.split(';');
      for (let s of segments) {
        let [prop, val] = s.split(':');
        prop = prop.trim();
        val = val.trim();
        this.css[prop] = val;
      }
    }
  }

  get tagName () {
    return this.node.tagName;
  }

  setAttr (k, v) {
    this.attrs[k] = v;
  }

  getAttr (k) {
    return this.attrs[k] || '';
  }

  isVisible () {
    return this.nodeAttrs.visible !== 'false';
  }

  isEnabled () {
    return this.nodeAttrs.enabled !== 'false';
  }

  isSelected () {
    return this.nodeAttrs.selected === 'true';
  }

  getLocation () {
    return {
      x: parseFloat(this.nodeAttrs.left || 0),
      y: parseFloat(this.nodeAttrs.top || 0)
    };
  }

  getSize () {
    return {
      width: parseFloat(this.nodeAttrs.width || 0),
      height: parseFloat(this.nodeAttrs.height || 0)
    };
  }

  click () {
    let curClicks = this.getAttr('clicks') || 0;
    this.setAttr('clicks', curClicks + 1);
    let alertId = this.nodeAttrs.showAlert;
    if (alertId) {
      this.app.showAlert(alertId);
    }
  }

  equals (other) {
    return this.node === other.node;
  }

  hasPrompt () {
    return this.nodeAttrs.hasPrompt === 'true';
  }

  getCss (prop) {
    if (_.has(this.css, prop)) {
      return this.css[prop];
    }
    return null;
  }

  get xmlFragment () {
    let frag = new XMLDom.XMLSerializer().serializeToString(this.node);
    return new XMLDom.DOMParser().parseFromString(frag, 'application/xml');
  }

}

export { FakeElement };
