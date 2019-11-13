import _ from 'lodash';

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
 * @param {?string|Array<string>} type - the event type to filter with.
 * It returns all events if the type is not provided or empty string/array.
 * @returns {object} - the event history log object
 */
commands.getLogEvents = function (type = null) {
  if (_.isEmpty(type)) {
    return this._eventHistory;
  }

  if (!_.isArray(type)) {
    type = [type];
  }

  return _.reduce(this._eventHistory, (acc, eventTimes, eventType) => {
    if (type.includes(eventType)) {
      acc[eventType] = eventTimes;
    }
    return acc;
  }, {});
};

export default commands;
