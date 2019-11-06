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

/**
 * Get the event log
 *
 * @param {string} type - currently unused but a placeholder for a future
 * feature where filtering of log events is allowed
 * @returns {object} - the event history log object
 */
commands.getLogEvents = function (/*type*/) {
  // type is currently unused but may be implemented for filtering later on
  return this._eventHistory;
};

export default commands;
