const commands = {};

/**
 * Log a user-defined event in the event log.
 *
 * @param {string} vendor - a vendor prefix for the user, to ensure namespace
 * separation
 * @param {string} event - the event name
 */
commands.logCustomEvent = function (vendor, event) {
  this.logEvent(`${vendor}:${event}`);
};

export default commands;
