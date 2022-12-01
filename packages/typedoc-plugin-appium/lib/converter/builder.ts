/**
 * A thing that creates {@linkcode typedoc!DeclarationReflection} instances from parsed
 * command & execute method data.
 * @module
 */

import {Context, ReflectionKind} from 'typedoc';
import {AppiumPluginLogger} from '../logger';
import {
  CommandData,
  CommandInfo,
  CommandReflection,
  CommandsReflection,
  ExecMethodData,
  ModuleCommands,
  ParentReflection,
  Route,
} from '../model';

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
function createCommandReflection(
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
 * Create a new {@linkcode CommandsReflection} and all {@linkcode CommandReflection} children within it.
 * @param log - Logger
 * @param ctx - Current context
 * @param parent - Parent module (or project)
 * @param commandInfo - Command information for `module`
 * @internal
 */
function createCommandsReflection(
  log: AppiumPluginLogger,
  ctx: Context,
  parent: ParentReflection,
  commandInfo: CommandInfo
): CommandsReflection {
  // TODO: parent.name may not be right here
  const commandsRefl = new CommandsReflection(parent.name, ctx.project, commandInfo);
  /**
   * See note in `#createCommandReflection` above about this call
   */
  ctx.postReflectionCreation(commandsRefl, undefined, undefined);

  const parentCtx = ctx.withScope(commandsRefl);
  const {routeMap: routeMap, execMethodDataSet: execCommandsData} = commandInfo;

  // sort routes in alphabetical order
  const sortedRouteMap = new Map([...routeMap.entries()].sort());
  for (const [route, commandMap] of sortedRouteMap) {
    for (const data of commandMap.values()) {
      createCommandReflection(log, parentCtx, data, commandsRefl, route);
    }
  }

  // sort execute commands in alphabetical order
  const sortedExecCommandsData = new Set([...execCommandsData].sort());
  for (const data of sortedExecCommandsData) {
    createCommandReflection(log, parentCtx, data, commandsRefl);
  }

  ctx.finalizeDeclarationReflection(commandsRefl);
  return commandsRefl;
}

/**
 * Creates custom {@linkcode typedoc!DeclarationReflection}s from parsed command & execute method data.
 *
 * These instances are added to the {@linkcode Context} object itself; this mutates TypeDoc's internal state. Nothing is returned.
 * @param ctx TypeDoc Context
 * @param parentLog Plugin logger
 * @param commandInfo Command info from converter; a map of parent reflections to parsed data
 */
export function createReflections(
  ctx: Context,
  parentLog: AppiumPluginLogger,
  commandInfo: ModuleCommands
): void {
  const log = parentLog.createChildLogger('builder');
  const {project} = ctx;

  // note that this could be an empty array
  const modules = project.getChildrenByKind(ReflectionKind.Module);

  // the project itself may have commands, as well as any modules within the project
  const parents = [...modules, project].filter((parent) => commandInfo.get(parent)?.hasData);
  if (!parents.length) {
    log.warn('No Appium commands found in the entire project');
    // TODO: maybe we should abort processing gracefully here? or throw?
  }
  for (const parent of parents) {
    createCommandsReflection(log, ctx, parent, commandInfo.get(parent)!);
  }
}
