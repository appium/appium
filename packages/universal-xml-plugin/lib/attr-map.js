/**
 * Uses the same format as NODE_MAP in node-map.js
 *
 * @typedef {Object} AttributeMap
 * @property {Attribute} x
 * @property {Attribute} y
 * @property {Attribute} width
 * @property {Attribute} height
 * @property {Attribute} enabled
 * @property {Attribute} axId
 * @property {Attribute} text
 * @property {Attribute} visible
 * @property {Attribute} value
 */
const ATTR_MAP = {
  x: {ios: 'x', android: 'x'},
  y: {ios: 'y', android: 'y'},
  width: {ios: 'width', android: 'width'},
  height: {ios: 'height', android: 'height'},
  enabled: {ios: 'enabled', android: 'enabled'},
  axId: {ios: 'name', android: 'content-desc'},
  id: {android: 'resource-id'},
  text: {ios: 'label', android: 'text'},
  visible: {ios: 'visible', android: 'displayed'},
  value: {ios: 'value'},
};

/**
 * These attributes shouldn't be mapped and should instead just be removed
 *
 * @type {string[]}
 */
const REMOVE_ATTRS = [
  'index',
  'type',
  'package',
  'class',
  'checkable',
  'checked',
  'clickable',
  'enabled',
  'focusable',
  'focused',
  'long-clickable',
  'password',
  'scrollable',
  'selected',
  'bounds',
  'rotation',
];

export {ATTR_MAP, REMOVE_ATTRS};

/**
 * @typedef Attribute
 * @property {string} [ios]
 * @property {string} [android]
 */
