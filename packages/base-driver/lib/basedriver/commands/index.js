// @ts-check
import _ from 'lodash';
import {EventMixin} from './event';
import {FindMixin} from './find';
import {LogMixin} from './log';
import {SessionMixin} from './session';
import {SettingsMixin} from './settings';
import {TimeoutMixin} from './timeout';
import {ExecuteMixin} from './execute';

/**
 * Applies all the mixins to the `BaseDriverBase` class; returns a `BaseDriver` class definition.
 * Each mixin is applied in the order it is listed here, and each type is a union with the previous.
 *
 * @template {Constraints} C
 * @param {BaseDriverBase<C>} Base
 */
export const createBaseDriverClass = _.flow(
  TimeoutMixin,
  EventMixin,
  FindMixin,
  LogMixin,
  SettingsMixin,
  SessionMixin,
  ExecuteMixin
);

/**
 * @template {Constraints} C
 * @typedef {import('../driver').BaseDriverBase<C>} BaseDriverBase
 */

/**
 * @typedef {import('@appium/types').Constraints} Constraints
 */
