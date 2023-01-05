import {ATTR_PREFIX} from './source';

/**
 * iOS just return what it receive
 *
 * @param {Object} nodeObj
 * @returns {Object}
 */
function ios(nodeObj /*, metadata*/) {
  return nodeObj;
}

/**
 * @param {AndroidNodeObject} nodeObj
 * @param {AndroidMetaData} metadata
 */
function android(nodeObj, metadata) {
  // strip android:id from front of id
  const resId = nodeObj[`${ATTR_PREFIX}resource-id`];
  if (resId && metadata.appPackage) {
    nodeObj[`${ATTR_PREFIX}resource-id`] = resId.replace(`${metadata.appPackage}:id/`, '');
  }

  // turn bounds attr into rect-based attrs
  if (nodeObj[`${ATTR_PREFIX}bounds`]) {
    const boundsArray = nodeObj[`${ATTR_PREFIX}bounds`]
      .split(/\[|\]|,/)
      .filter((str) => str !== '');
    const [x, y, x2, y2] = boundsArray;
    const width = x2 - x;
    const height = y2 - y;
    nodeObj[`${ATTR_PREFIX}x`] = x;
    nodeObj[`${ATTR_PREFIX}y`] = y;
    nodeObj[`${ATTR_PREFIX}width`] = width;
    nodeObj[`${ATTR_PREFIX}height`] = height;
  }
}

export default {
  ios,
  android,
};

/**
 * An object representing a node in an Android platform.
 *
 * @typedef AndroidNodeObject
 * @property {string} @_resource-id - The resource id of the node.
 * @property {string[]} @_bounds - The bounds of the node.
 * @property {number} @_x - The x coordinate of the node.
 * @property {number} @_y - The y coordinate of the node.
 * @property {number} @_width - The width of the node.
 * @property {number} @_height - The height of the node.
 */

/**
 * @typedef AndroidMetaData
 * @property {string} appPackage - The app package name.
 */
