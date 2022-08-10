// @ts-check

import {EventMixin} from './event';
import {FindMixin} from './find';
import {LogMixin} from './log';
import {SessionMixin} from './session';
import {SettingsMixin} from './settings';
import {TimeoutMixin} from './timeout';
import {ExecuteMixin} from './execute';

/**
 * Applies all the mixins to the `BaseDriverBase` class.
 * Returns a `BaseDriver` class.
 * @param {BaseDriverBase} Base
 */
export function createBaseDriverClass(Base) {
  const WithTimeoutCommands = TimeoutMixin(Base);
  const WithEventCommands = EventMixin(WithTimeoutCommands);
  const WithFindCommands = FindMixin(WithEventCommands);
  const WithLogCommands = LogMixin(WithFindCommands);
  const WithSettingsCommands = SettingsMixin(WithLogCommands);
  const WithSessionCommands = SessionMixin(WithSettingsCommands);
  const WithExecuteCommands = ExecuteMixin(WithSessionCommands);
  return WithExecuteCommands;
}

/**
 * @template [T={}]
 * @typedef {import('../driver').BaseDriverBase<T>} BaseDriverBase
 */
