/**
 * Converts code parsed by TypeDoc into a data structure describing the commands and execute methods, which will later be used to create new {@linkcode typedoc#DeclarationReflection} instances in the TypeDoc context.
 *
 * The logic in this module is highly dependent on Appium's extension API, and is further dependent on specific usages of TS types.  Anything that will be parsed successfully by this module must use a `const` type alias in TS parlance.  For example:
 *
 * ```ts
 * const METHOD_MAP = {
 *   '/status': {
 *     GET: {command: 'getStatus'}
 *   },
 *   // ...
 * } as const; // <-- required
 * ```
 * @module
 */

import {Context} from 'typedoc';
import {AppiumPluginLogger} from '../logger';
import {ProjectCommands} from '../model';
import {BuiltinExternalDriverConverter} from './builtin-external-driver';
import {BuiltinMethodMapConverter} from './builtin-method-map';
import {ExternalConverter} from './external';

/**
 * Converts declarations into information about the commands found within
 * @param ctx - Current TypeDoc context
 * @param parentLog - Logger
 * @returns All commands found in the project
 */
export function convertCommands(
  ctx: Context,
  parentLog: AppiumPluginLogger
): ProjectCommands | undefined {
  const log = parentLog.createChildLogger('converter');

  const bedConverter = new BuiltinExternalDriverConverter(ctx, log);
  const builtinMethods = bedConverter.convert();

  const bmmConverter = new BuiltinMethodMapConverter(ctx, log, builtinMethods);
  const builtinCommands = bmmConverter.convert();

  const externalConverter = new ExternalConverter(
    ctx,
    log,
    builtinMethods,
    builtinCommands.moduleCmds
  );
  const externalCommands = externalConverter.convert();

  const allCommands = [...builtinCommands.toProjectCommands(), ...externalCommands];

  const projectCmds = new ProjectCommands(allCommands);

  if (projectCmds.isEmpty) {
    return;
  }

  return projectCmds;
}

export * from '../model/builtin-commands';
export * from './base-converter';
export * from './builder';
export * from './builtin-external-driver';
export * from './builtin-method-map';
export * from './comment';
export * from './exec-method-map';
export * from './external';
export * from './method-map';
export * from './overrides';
export * from './types';
export * from './utils';
