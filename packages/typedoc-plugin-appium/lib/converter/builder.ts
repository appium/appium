/**
 * A thing that creates {@linkcode typedoc#DeclarationReflection} instances from parsed
 * command & execute method data.
 * @module
 */

import _ from 'lodash';
import pluralize from 'pluralize';
import {ContainerReflection, Context, DeclarationReflection, ProjectReflection} from 'typedoc';
import {isParentReflection} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {
  AppiumPluginReflectionKind,
  CommandData,
  CommandReflection,
  ExecMethodData,
  ExtensionReflection,
  ModuleCommands,
  ProjectCommands,
  Route,
} from '../model';
import {PackageTitle} from '../options/declarations';
import {NAME_BUILTIN_COMMAND_MODULE} from './builtin-method-map';
import {findChildByNameAndGuard} from './utils';

/**
 * Creates and adds a child {@linkcode CommandReflection} to this reflection
 *
 * During "normal" usage of TypeDoc, one would call
 * `createDeclarationReflection()`. But since we've subclassed
 * `DeclarationReflection`, we cannot call it directly.  It doesn't seem to do
 * anything useful besides instantiation then delegating to
 * `postReflectionCreation()`; so we just need to call it directly.
 *
 * Finally, we call `finalizeDeclarationReflection()` which I think just fires
 * some events for other plugins to potentially use.
 * @param log Logger
 * @param data Command reference
 * @param route Route
 * @param parent Commands reflection
 * @internal
 */
export function createCommandReflection(
  ctx: Context,
  data: CommandData | ExecMethodData,
  parent: ExtensionReflection,
  route?: Route
): void {
  const commandRefl = new CommandReflection(data, parent, route);
  // yes, the `undefined`s are needed
  ctx.postReflectionCreation(commandRefl, undefined, undefined);
  ctx.finalizeDeclarationReflection(commandRefl);
}

/**
 * Create a new {@linkcode ExtensionReflection} and all {@linkcode CommandReflection} children within
 * it.
 *
 * Note that the return value is mainly for informational purposes, since this method mutates
 * TypeDoc's state.
 * @param log - Logger
 * @param ctx - Context
 * @param name - Name of module containing commands
 * @param moduleCmds - Command information for `module`
 * @internal
 */
export function createExtensionReflection(
  log: AppiumPluginLogger,
  ctx: Context,
  name: string,
  moduleCmds: ModuleCommands
): ExtensionReflection {
  const packageTitles = ctx.converter.application.options.getValue(
    'packageTitles'
  ) as PackageTitle[];
  log.verbose(`Value of packageTitles: %O`, packageTitles);
  // TODO: parent.name may not be right here
  const extRefl = new ExtensionReflection(
    name,
    ctx.project,
    moduleCmds,
    packageTitles.find((p) => p.name === name)?.title
  );
  /**
   * See note in {@link createCommandReflection} above about this call
   */
  ctx.postReflectionCreation(extRefl, undefined, undefined);

  const parentCtx = ctx.withScope(extRefl);
  const {routeMap: routeMap, execMethodDataSet: execCommandsData} = moduleCmds;

  for (const [route, commandSet] of routeMap) {
    for (const data of commandSet) {
      createCommandReflection(parentCtx, data, extRefl, route);
    }
  }

  for (const data of execCommandsData) {
    createCommandReflection(parentCtx, data, extRefl);
  }

  ctx.finalizeDeclarationReflection(extRefl);
  return extRefl;
}

/**
 * Creates custom {@linkcode typedoc#DeclarationReflection}s from parsed command & execute method data.
 *
 * These instances are added to the {@linkcode Context} object itself; this mutates TypeDoc's internal state. Nothing is returned.
 * @param ctx TypeDoc Context
 * @param parentLog Plugin logger
 * @param projectCmds Command info from converter; a map of parent reflections to parsed data
 * @returns List of {@linkcode ExtensionReflection} instances
 */
export function createReflections(
  ctx: Context,
  parentLog: AppiumPluginLogger,
  projectCmds: ProjectCommands
): ExtensionReflection[] {
  const log = parentLog.createChildLogger('builder');
  const {project} = ctx;

  if (!projectCmds.size) {
    log.error('No reflections to create; nothing to do.');
    return [];
  }

  return [...projectCmds.entries()].map(([parentName, parentCmds]) => {
    const parentRefl =
      project.name === parentName
        ? project
        : findChildByNameAndGuard(project, parentName, isParentReflection)!;

    const cmdsRefl = createExtensionReflection(log, ctx, parentRefl.name, parentCmds);

    log.info(
      '(%s) Created %d new command %s',
      parentName,
      cmdsRefl.children?.length ?? 0,
      pluralize('reflection', cmdsRefl.children?.length ?? 0)
    );
    return cmdsRefl;
  });
}

/**
 * Removes any reflection _not_ created by this plugin from the TypeDoc refl _except_ those
 * created by this plugin.
 * @param project - Current TypeDoc project
 * @param refl - A {@linkcode ContainerReflection} to remove children from; defaults to `project`
 * @returns A set of removed {@linkcode DeclarationReflection DeclarationReflections}
 */
export function omitDefaultReflections(
  project: ProjectReflection,
  refl: ContainerReflection = project
): Set<DeclarationReflection> {
  const removed = new Set<DeclarationReflection>();
  for (const childRefl of refl.getChildrenByKind(~(AppiumPluginReflectionKind.Extension as any))) {
    project.removeReflection(childRefl);
    removed.add(childRefl);
  }

  return removed;
}

/**
 * Removes extension reflection(s) which are part of Appium itself.  This is desirable for most
 * extension authors.
 * @param project - Current TypeDoc project
 * @param refl - A {@linkcode ContainerReflection} to remove children from; defaults to `project`
 * @returns A set of removed {@linkcode DeclarationReflection}s
 */
export function omitBuiltinReflections(
  project: ProjectReflection,
  refl: ContainerReflection = project
) {
  const removed = new Set<DeclarationReflection>();

  const extRefls = refl.getChildrenByKind(
    AppiumPluginReflectionKind.Extension as any
  ) as DeclarationReflection[];
  const builtinRefl = _.find(extRefls, {name: NAME_BUILTIN_COMMAND_MODULE});
  if (!builtinRefl) {
    throw new Error(`Could not find builtin commands reflection "${NAME_BUILTIN_COMMAND_MODULE}"`);
  }
  project.removeReflection(builtinRefl);
  removed.add(builtinRefl);

  return removed;
}
