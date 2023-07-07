/**
 * This module re-exports all of the types from `appium/types`, the {@linkcode main} function, and some other utils.
 * @module
 */

import {env} from '@appium/support';

export const {resolveAppiumHome} = env;
export type * from 'appium/types';
export {readConfigFile, type ReadConfigFileOptions, type ReadConfigFileResult} from './config-file';
export {init, main} from './main';
export {
  finalizeSchema,
  getSchema,
  validate,
  type SchemaObject,
  type StrictSchemaObject,
  type StrictProp,
} from './schema/schema';
