/**
 * A thing that creates {@linkcode typedoc#DeclarationReflection} instances from parsed
 * command & execute method data.
 * @module
 */

import _ from 'lodash';
import pluralize from 'pluralize';
import {Context} from 'typedoc';
import {isParentReflection} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {
  CommandData,
  ModuleCommands,
  CommandReflection,
  CommandsReflection,
  ExecMethodData,
  ParentReflection,
  ProjectCommands,
  Route,
} from '../model';
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
  log: AppiumPluginLogger,
  ctx: Context,
  data: CommandData | ExecMethodData,
  parent: CommandsReflection,
  route?: Route
): void {
  const commandRefl = new CommandReflection(data, parent, route);
  // yes, the `undefined`s are needed
  ctx.postReflectionCreation(commandRefl, undefined, undefined);
  ctx.finalizeDeclarationReflection(commandRefl);
}

/**
 * Create a new {@linkcode CommandsReflection} and all {@linkcode CommandReflection} children within
 * it.
 *
 * Note that the return value is mainly for informational purposes, since this method mutates
 * TypeDoc's state.
 * @param log - Logger
 * @param ctx - Current context
 * @param parent - Parent module (or project)
 * @param moduleCmds - Command information for `module`
 * @internal
 */
export function createCommandsReflection(
  log: AppiumPluginLogger,
  ctx: Context,
  parent: ParentReflection,
  moduleCmds: ModuleCommands
): CommandsReflection {
  // TODO: parent.name may not be right here
  const commandsRefl = new CommandsReflection(parent.name, ctx.project, moduleCmds);
  /**
   * See note in {@link createCommandReflection} above about this call
   */
  ctx.postReflectionCreation(commandsRefl, undefined, undefined);

  const parentCtx = ctx.withScope(commandsRefl);
  const {routeMap: routeMap, execMethodDataSet: execCommandsData} = moduleCmds;

  const sortedRouteMap = new Map([...routeMap].sort(([a], [b]) => a.localeCompare(b)));

  for (const [route, commandSet] of sortedRouteMap) {
    for (const data of commandSet) {
      createCommandReflection(log, parentCtx, data, commandsRefl, route);
    }
  }

  // sort execute methods in alphabetical order by script
  const sortedExecCommandsData = [...execCommandsData].sort((a, b) =>
    a.script.localeCompare(b.script)
  );
  for (const data of sortedExecCommandsData) {
    createCommandReflection(log, parentCtx, data, commandsRefl);
  }

  ctx.finalizeDeclarationReflection(commandsRefl);
  return commandsRefl;
}

/**
 * Creates custom {@linkcode typedoc#DeclarationReflection}s from parsed command & execute method data.
 *
 * These instances are added to the {@linkcode Context} object itself; this mutates TypeDoc's internal state. Nothing is returned.
 * @param ctx TypeDoc Context
 * @param parentLog Plugin logger
 * @param projectCmds Command info from converter; a map of parent reflections to parsed data
 * @returns List of {@linkcode CommandsReflection} instances
 */
export function createReflections(
  ctx: Context,
  parentLog: AppiumPluginLogger,
  projectCmds: ProjectCommands
): CommandsReflection[] {
  const log = parentLog.createChildLogger('builder');
  const {project} = ctx;

  if (_.isEmpty(projectCmds)) {
    log.error('No Appium commands found in the entire project!');
    return [];
  }

  return [...projectCmds.entries()].map(([parentName, parentCmds]) => {
    const parentRefl =
      project.name === parentName
        ? project
        : findChildByNameAndGuard(project, parentName, isParentReflection)!;

    const cmdsRefl = createCommandsReflection(log, ctx, parentRefl, parentCmds);

    log.info(
      '(%s) Created %d new command %s',
      parentName,
      cmdsRefl.children?.length ?? 0,
      pluralize('reflection', cmdsRefl.children?.length ?? 0)
    );
    return cmdsRefl;
  });
}
