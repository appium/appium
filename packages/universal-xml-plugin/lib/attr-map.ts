// uses the same format as NODE_MAP in node-map.js
import type {UniversalNameMap} from './types';

export const ATTR_MAP: UniversalNameMap = {
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
export const REMOVE_ATTRS = [
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
] as const;
