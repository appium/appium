import _ from 'lodash';
import { duplicateKeys } from '../basedriver/helpers';
import BaseDriver from '../basedriver/driver';


const MJSONWP_ELEMENT_KEY = 'ELEMENT';
const W3C_ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';
const JSONWP_SUCCESS_STATUS_CODE = 0;

/**
 * Preprocesses the resulting value for API responses,
 * so they have keys for both W3C and JSONWP protocols.
 * The argument value is NOT mutated
 *
 * @param {?Object} resValue The actual response value
 * @returns {?Object} Either modified value or the same one if
 * nothing has been modified
 */
function formatResponseValue (resValue) {
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
 * so they are correct for both W3C and JSONWP protocols.
 * This method DOES mutate the `responseBody` argument if needed
 *
 * @param {Object} responseBody
 * @param {?string} protocol The name of the protocol, either
 * `BaseDriver.DRIVER_PROTOCOL.W3C` or `BaseDriver.DRIVER_PROTOCOL.MJSONWP`
 * @returns {Object} The fixed response body
 */
function formatStatus (responseBody, protocol = null) {
  if (!_.isPlainObject(responseBody) || !protocol) {
    return responseBody;
  }
  if (protocol === BaseDriver.DRIVER_PROTOCOL.MJSONWP && !_.isInteger(responseBody.status)) {
    // Response status should be the status set by the driver response.
    responseBody.status = JSONWP_SUCCESS_STATUS_CODE;
  }
  if (protocol === BaseDriver.DRIVER_PROTOCOL.W3C && !_.isUndefined(responseBody.status)) {
    delete responseBody.status;
  }
  return responseBody;
}


export {
  MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY, formatResponseValue,
  JSONWP_SUCCESS_STATUS_CODE, formatStatus,
};
