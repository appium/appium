import {ATTR_PREFIX} from './source';

function ios(nodeObj /*, metadata*/) {
  return nodeObj;
}

function android(nodeObj, metadata) {
  // strip android:id from front of id
  const resId = nodeObj[`${ATTR_PREFIX}resource-id`];
  if (resId && metadata.appPackage) {
    nodeObj[`${ATTR_PREFIX}resource-id`] = resId.replace(
      `${metadata.appPackage}:id/`,
      ''
    );
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
