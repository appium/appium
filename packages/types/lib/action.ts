/**
 * Portions Copyright (c) 2017 Igor Muchychka
 * @see https://github.com/w3c-webdriver/w3c-webdriver
 * @module
 */

import {Element} from './util';

/**
 * @group Actions
 */
export type PauseAction = {
  type: 'pause';
  duration: number;
};

/**
 * @group Actions
 */
export type KeyDownAction = {
  type: 'keyDown';
  value: Key | string;
};

/**
 * @group Actions
 */
export type KeyUpAction = {
  type: 'keyUp';
  value: Key | string;
};

/**
 * @group Actions
 */
export type PointerMoveAction = {
  type: 'pointerMove';
  x: number;
  y: number;
  duration?: number;
  origin?: 'viewport' | 'pointer' | Element;
};

/**
 * @group Actions
 */
export type PointerUpAction = {
  type: 'pointerUp';
  button: number;
};

/**
 * @group Actions
 */
export type PointerDownAction = {
  type: 'pointerDown';
  button: number;
};

/**
 * @group Actions
 */
export type ScrollAction = {
  type: 'scroll';
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  duration?: number;
  origin?: 'viewport' | Element;
};

/**
 * @group Actions
 */
export type NullAction = PauseAction;

/**
 * @group Actions
 */
export type KeyAction = PauseAction | KeyDownAction | KeyUpAction;

/**
 * @group Actions
 */
export type PointerAction = PauseAction | PointerMoveAction | PointerUpAction | PointerDownAction;

/**
 * @group Actions
 */
export type WheelAction = PauseAction | ScrollAction;

/**
 * @group Actions
 */
export type NullActionSequence = {
  type: 'none';
  id: string;
  actions: NullAction[];
};

/**
 * @group Actions
 */
export type KeyActionSequence = {
  type: 'key';
  id: string;
  actions: KeyAction[];
};

/**
 * @group Actions
 */
export type PointerParameters = {
  pointerType: 'mouse' | 'pen' | 'touch';
};

/**
 * @group Actions
 */
export type PointerActionSequence = {
  type: 'pointer';
  id: string;
  actions: PointerAction[];
  parameters?: PointerParameters;
};

/**
 * @group Actions
 */
export type WheelActionSequence = {
  type: 'wheel';
  id: string;
  actions: WheelAction[];
};

/**
 * @group Actions
 */
export type ActionSequence =
  | NullActionSequence
  | KeyActionSequence
  | PointerActionSequence
  | WheelActionSequence;

/**
 * @group Actions
 */
export enum Key {
  NULL = '\uE000',
  CANCEL = '\uE001',
  HELP = '\uE002',
  BACKSPACE = '\uE003',
  TAB = '\uE004',
  CLEAR = '\uE005',
  RETURN = '\uE006',
  ENTER = '\uE007',
  SHIFT = '\uE008',
  CONTROL = '\uE009',
  ALT = '\uE00a',
  PAUSE = '\uE00b',
  ESCAPE = '\uE00c',
  SPACE = '\uE00d',
  PAGE_UP = '\uE00e',
  PAGE_DOWN = '\uE00f',
  END = '\uE010',
  HOME = '\uE011',
  LEFT = '\uE012',
  UP = '\uE013',
  RIGHT = '\uE014',
  DOWN = '\uE015',
  INSERT = '\uE016',
  DELETE = '\uE017',
  SEMICOLON = '\uE018',
  EQUALS = '\uE019',
  NUMPAD0 = '\uE01a',
  NUMPAD1 = '\uE01b',
  NUMPAD2 = '\uE01c',
  NUMPAD3 = '\uE01d',
  NUMPAD4 = '\uE01e',
  NUMPAD5 = '\uE01f',
  NUMPAD6 = '\uE020',
  NUMPAD7 = '\uE021',
  NUMPAD8 = '\uE022',
  NUMPAD9 = '\uE023',
  MULTIPLY = '\uE024',
  ADD = '\uE025',
  SEPARATOR = '\uE026',
  SUBTRACT = '\uE027',
  DECIMAL = '\uE028',
  DIVIDE = '\uE029',
  F1 = '\uE031',
  F2 = '\uE032',
  F3 = '\uE033',
  F4 = '\uE034',
  F5 = '\uE035',
  F6 = '\uE036',
  F7 = '\uE037',
  F8 = '\uE038',
  F9 = '\uE039',
  F10 = '\uE03a',
  F11 = '\uE03b',
  F12 = '\uE03c',
  META = '\uE03d',
  ZENKAKUHANKAKU = '\uE040',
  R_SHIFT = '\uE050',
  R_CONTROL = '\uE051',
  R_ALT = '\uE052',
  R_META = '\uE053',
  R_PAGEUP = '\uE054',
  R_PAGEDOWN = '\uE055',
  R_END = '\uE056',
  R_HOME = '\uE057',
  R_ARROWLEFT = '\uE058',
  R_ARROWUP = '\uE059',
  R_ARROWRIGHT = '\uE05A',
  R_ARROWDOWN = '\uE05B',
  R_INSERT = '\uE05C',
  R_DELETE = '\uE05D',
}
