import {ATTR_PREFIX} from './source';
import type {TransformMetadata} from './types';

/**
 * No-op transformer for iOS source XML.
 * @param nodeObj Node object to transform.
 */
export function ios(nodeObj: any): void {
  void nodeObj;
  // iOS transformer does nothing
}

/**
 * Normalizes Android-specific attributes in source XML.
 * @param nodeObj Node object to transform.
 * @param metadata Transformation metadata.
 */
export function android(nodeObj: any, metadata: TransformMetadata): void {
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
    const width = parseInt(x2, 10) - parseInt(x, 10);
    const height = parseInt(y2, 10) - parseInt(y, 10);
    nodeObj[`${ATTR_PREFIX}x`] = x;
    nodeObj[`${ATTR_PREFIX}y`] = y;
    nodeObj[`${ATTR_PREFIX}width`] = width.toString();
    nodeObj[`${ATTR_PREFIX}height`] = height.toString();
  }
}
