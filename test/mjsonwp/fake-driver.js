import { errors, MobileJsonWireProtocol } from '../..';
import _ from 'lodash';

class FakeDriver extends MobileJsonWireProtocol {

  constructor () {
    super();
    this.sessionId = null;
    this.jwpProxyActive = false;
  }

  sessionExists (sessionId) {
    if (!sessionId) return false;
    return sessionId === this.sessionId;
  }

  driverForSession (/*sessionId*/) {
    return this;
  }

  async createSession (desiredCapabilities, requiredCapabilities, capabilities) {
    this.sessionId = "1234";
    if (capabilities) {
      return [this.sessionId, capabilities];
    } else {
      this.desiredCapabilities = desiredCapabilities;
      this.requiredCapabilities = requiredCapabilities || {};
      return [this.sessionId, _.extend({}, desiredCapabilities, requiredCapabilities)];
    }
  }

  async executeCommand (cmd, ...args) {
    if (!this[cmd]) {
      throw new errors.NotYetImplementedError();
    }
    return await this[cmd](...args);
  }

  async deleteSession () {
    this.jwpProxyActive = false;
    this.sessionId = null;
  }

  async getStatus () {
    return "I'm fine";
  }

  async setUrl (url) {
    return `Navigated to: ${url}`;
  }

  async getUrl () {
    return "http://foobar.com";
  }

  async back (sessionId) {
    return sessionId;
  }

  async forward () {}

  async refresh () {
    throw new Error('Too Fresh!');
  }

  async getSession () {
    throw new errors.NoSuchDriverError();
  }

  async click (elementId, sessionId) {
    return [elementId, sessionId];
  }

  async implicitWait (ms) {
    return ms;
  }

  async clickCurrent (button) {
    return button;
  }

  async setNetworkConnection (type) {
    return type;
  }

  async moveTo (element, xOffset, yOffset) {
    return [element, xOffset, yOffset];
  }

  async getText () {
    return "";
  }

  async getAttribute (attr, elementId, sessionId) {
    return [attr, elementId, sessionId];
  }

  async setValue (elementId, value) {
    return value;
  }

  async performTouch (...args) {
    return args;
  }

  async setFrame (frameId) {
    return frameId;
  }

  async removeApp (app) {
    return app;
  }

  async receiveAsyncResponse () {
    // this is here to test a failing command that does not throw an error
    return {status: 13, value: 'Mishandled Driver Error'};
  }

  proxyActive (/*sessionId*/) {
    return false;
  }

  getProxyAvoidList (/*sessionId*/) {
    return [];
  }

  canProxy (/*sessionId*/) {
    return false;
  }
}

export { FakeDriver };
