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

import {Context, ProjectReflection, ReflectionKind} from 'typedoc';
import {AppiumPluginLogger} from '../logger';
import {
  AppiumPluginReflectionKind,
  AppiumPluginReflectionKindGroupTitles,
  ProjectCommands,
} from '../model';
import {BuiltinExternalDriverConverter} from './builtin-external-driver';
import {BuiltinMethodMapConverter} from './builtin-method-map';
import {ExternalConverter} from './external';

/**
 * Converts declarations into information about the commands found within
 * @param ctx - Current TypeDoc context
 * @param parentLog - Logger
 * @returns All commands found in the project
 */
export function convertCommands(ctx: Context, parentLog: AppiumPluginLogger): ProjectCommands {
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

  return new ProjectCommands(allCommands);
}

/**
 * Removes any reflection _not_ created by this plugin from the TypeDoc project _except_ the main
 * project and its module children (if any).
 *
 * This includes removal of groups from the main project.
 * @param project - Current TypeDoc project
 * @returns Project w/o the stuff in it.  It is mutated in place.
 */
export function omitDefaultReflections(project: ProjectReflection): ProjectReflection {
  // find all modules under the project, then anything not created by this plugin, and remove it
  for (const module of project.getChildrenByKind(ReflectionKind.Module)) {
    for (const child of module.getChildrenByKind(~(AppiumPluginReflectionKind.Extension as any))) {
      project.removeReflection(child);
    }
  }
  // find anything under the project itself not created by this plugin (except modules) and remove it
  for (const child of project.getChildrenByKind(
    ~(AppiumPluginReflectionKind.Extension as any) & ~ReflectionKind.Module
  )) {
    project.removeReflection(child);
  }

  /// remove all groups except those created for the ReflectionKinds in this plugin
  project.groups = project.groups?.filter((group) =>
    AppiumPluginReflectionKindGroupTitles.has(group.title)
  );

  return project;
}

export * from './base-converter';
export * from './builder';
export * from '../model/builtin-commands';
export * from './builtin-external-driver';
export * from './builtin-method-map';
export * from './comment';
export * from './exec-method-map';
export * from './external';
export * from './method-map';
export * from './overrides';
export * from './types';
export * from './utils';
