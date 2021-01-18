// uses the same format as NODE_MAP in node-map.js
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

// these attributes shouldn't be mapped and should instead just be removed
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

export { ATTR_MAP, REMOVE_ATTRS };
