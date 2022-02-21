/* eslint-disable require-await */
import _ from 'lodash';
import { errors } from '../../protocol';
import { util } from '@appium/support';
import {
  processCapabilities, promoteAppiumOptions, APPIUM_OPTS_CAP, PREFIXED_APPIUM_OPTS_CAP,
} from '../capabilities';
import { isW3cCaps } from '../../helpers/capabilities';

const commands = {};

commands.createSession = async function createSession (w3cCapabilities1, w3cCapabilities2, w3cCapabilities) {
  if (this.sessionId !== null) {
    throw new errors.SessionNotCreatedError('Cannot create a new session while one is in progress');
  }

  this.log.debug();

  // Historically the first two arguments were reserved for JSONWP capabilities.
  // Appium 2 has dropped the support of these, so now we only accept capability
  // objects in W3C format and thus allow any of the three arguments to represent
  // the latter.
  const originalCaps = [w3cCapabilities, w3cCapabilities1, w3cCapabilities2].find(isW3cCaps);
  if (!originalCaps) {
    throw new errors.SessionNotCreatedError('Appium only supports W3C-style capability objects. ' +
      'Your client is sending an older capabilities format. Please update your client library.');
  }

  this.setProtocolW3C();

  this.originalCaps = _.cloneDeep(originalCaps);
  this.log.debug(`Creating session with W3C capabilities: ${JSON.stringify(originalCaps, null, 2)}`);

  let caps;
  try {
    caps = processCapabilities(originalCaps, this.desiredCapConstraints, this.shouldValidateCaps);
    if (caps[APPIUM_OPTS_CAP]) {
      this.log.debug(`Found ${PREFIXED_APPIUM_OPTS_CAP} capability present; will promote items inside to caps`);
      caps = promoteAppiumOptions(caps);
    }
    caps = fixCaps(caps, this.desiredCapConstraints);
  } catch (e) {
    throw new errors.SessionNotCreatedError(e.message);
  }

  this.validateDesiredCaps(caps);

  this.sessionId = util.uuidV4();
  this.caps = caps;
  this.opts = _.cloneDeep(this.initialOpts);

  // merge caps onto opts so we don't need to worry about what's where
  Object.assign(this.opts, this.caps);

  // deal with resets
  // some people like to do weird things by setting noReset and fullReset
  // both to true, but this is misguided and strange, so error here instead
  if (this.opts.noReset && this.opts.fullReset) {
    throw new Error("The 'noReset' and 'fullReset' capabilities are mutually " +
                    'exclusive and should not both be set to true. You ' +
                    "probably meant to just use 'fullReset' on its own");
  }
  if (this.opts.noReset === true) {
    this.opts.fullReset = false;
  }
  if (this.opts.fullReset === true) {
    this.opts.noReset = false;
  }
  this.opts.fastReset = !this.opts.fullReset && !this.opts.noReset;
  this.opts.skipUninstall = this.opts.fastReset || this.opts.noReset;

  // Prevents empty string caps so we don't need to test it everywhere
  if (typeof this.opts.app === 'string' && this.opts.app.trim() === '') {
    this.opts.app = null;
  }

  if (!_.isUndefined(this.caps.newCommandTimeout)) {
    this.newCommandTimeoutMs = (this.caps.newCommandTimeout * 1000);
  }

  this.log.info(`Session created with session id: ${this.sessionId}`);

  return [this.sessionId, caps];
};

commands.getSessions = async function getSessions () {
  let ret = [];

  if (this.sessionId) {
    ret.push({
      id: this.sessionId,
      capabilities: this.caps
    });
  }

  return ret;
};

commands.getSession = async function getSession () {
  if (this.caps.eventTimings) {
    return Object.assign({}, this.caps, {events: this.eventHistory});
  }
  return this.caps;
};

commands.deleteSession = async function deleteSession (/* sessionId */) {
  this.clearNewCommandTimeout();
  if (this.isCommandsQueueEnabled && this.commandsQueueGuard.isBusy()) {
    // simple hack to release pending commands if they exist
    for (const key of _.keys(this.commandsQueueGuard.queues)) {
      this.commandsQueueGuard.queues[key] = [];
    }
  }
  this.sessionId = null;
};

function fixCaps (originalCaps, desiredCapConstraints = {}) {
  let caps = _.clone(originalCaps);

  // boolean capabilities can be passed in as strings 'false' and 'true'
  // which we want to translate into boolean values
  let booleanCaps = _.keys(_.pickBy(desiredCapConstraints, (k) => k.isBoolean === true));
  for (let cap of booleanCaps) {
    let value = originalCaps[cap];
    if (_.isString(value)) {
      value = value.toLowerCase();
      if (value === 'true' || value === 'false') {
        this.log.warn(`Capability '${cap}' changed from string to boolean. This may cause unexpected behavior`);
        caps[cap] = (value === 'true');
      }
    }
  }

  // int capabilities are often sent in as strings by frameworks
  let intCaps = _.keys(_.pickBy(desiredCapConstraints, (k) => k.isNumber === true));
  for (let cap of intCaps) {
    let value = originalCaps[cap];
    if (_.isString(value) && !isNaN(value)) {
      value = value.trim();
      let newValue = parseInt(value, 10);
      if (value !== `${newValue}`) {
        newValue = parseFloat(value);
      }
      this.log.warn(`Capability '${cap}' changed from string ('${value}') to integer (${newValue}). This may cause unexpected behavior`);
      caps[cap] = newValue;
    }
  }

  return caps;
}

export default commands;
export { promoteAppiumOptions };
