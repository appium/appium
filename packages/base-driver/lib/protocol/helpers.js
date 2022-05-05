import _ from 'lodash';
import {duplicateKeys} from '../basedriver/helpers';
import {MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY} from '../constants';

/**
 * Preprocesses the resulting value for API responses,
 * so they have keys for both W3C and JSONWP protocols.
 * The argument value is NOT mutated
 *
 * @param {?Object} resValue The actual response value
 * @returns {?Object} Either modified value or the same one if
 * nothing has been modified
 */
function formatResponseValue(resValue) {
  if (_.isUndefined(resValue)) {
    // convert undefined to null
    return null;
  }
  // If the MJSONWP element key format (ELEMENT) was provided, add a duplicate key (element-6066-11e4-a52e-4f735466cecf)
  // If the W3C element key format (element-6066-11e4-a52e-4f735466cecf) was provided, add a duplicate key (ELEMENT)
  return duplicateKeys(resValue, MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY);
}

/**
 * Properly formats the status for API responses,
 * so they are correct for the W3C protocol.
 *
 * @param {Object} responseBody
 * @returns {Object} The fixed response body
 */
function formatStatus(responseBody) {
  return _.isPlainObject(responseBody) ? _.omit(responseBody, ['status']) : responseBody;
}

export {MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY, formatResponseValue, formatStatus};
