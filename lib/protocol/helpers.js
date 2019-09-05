import _ from 'lodash';
import { duplicateKeys } from '../basedriver/helpers';
import { PROTOCOLS } from '.';


const MJSONWP_ELEMENT_KEY = 'ELEMENT';
const W3C_ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';
const JSONWP_SUCCESS_STATUS_CODE = 0;
const JSONWP_UNKNOWN_ERROR_STATUS_CODE = 13;

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
 * @param {number} responseCode the HTTP response code
 * @param {?string} protocol The name of the protocol, either
 * `PROTOCOLS.W3C` or `PROTOCOLS.MJSONWP`
 * @returns {Object} The fixed response body
 */
function formatStatus (responseBody, responseCode = 200, protocol = null) {
  if (!_.isPlainObject(responseBody)) {
    return responseBody;
  }
  const isError = _.has(responseBody.value, 'error') || responseCode >= 400;
  if ((protocol === PROTOCOLS.MJSONWP && !_.isInteger(responseBody.status))
    || (!protocol && !_.has(responseBody, 'status'))) {
    responseBody.status = isError
      ? JSONWP_UNKNOWN_ERROR_STATUS_CODE
      : JSONWP_SUCCESS_STATUS_CODE;
  } else if (protocol === PROTOCOLS.W3C && _.has(responseBody, 'status')) {
    delete responseBody.status;
  }
  return responseBody;
}


export {
  MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY, formatResponseValue,
  JSONWP_SUCCESS_STATUS_CODE, formatStatus,
};
