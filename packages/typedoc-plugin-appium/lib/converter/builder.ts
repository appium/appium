import {Context, ReflectionKind} from 'typedoc';
import {AppiumPluginLogger} from '../logger';
import {
  CommandData,
  CommandInfo,
  CommandReflection,
  CommandsReflection,
  ExecCommandData,
  ModuleCommands,
  ParentReflection,
  Route,
} from '../model';

export class CommandTreeBuilder {
  #log: AppiumPluginLogger;

  constructor(log: AppiumPluginLogger) {
    this.#log = log.createChildLogger('builder');
  }

  /**
   * Creates `DeclarationReflection` based on the `ModuleCommands` object & adds them to the project.
   * @param ctx TypeDoc Context
   * @param commands Data from the converter
   */
  public createReflections(ctx: Context, commands: ModuleCommands): void {
    const {project} = ctx;
    const modules = project.getChildrenByKind(ReflectionKind.Module);

    // the project itself may have commands, as well as any modules within the project
    const parents = [...modules, project].filter((parent) => commands.get(parent)?.hasCommands);
    if (parents.length) {
      for (const parent of parents) {
        this.#createCommandsReflection(ctx, parent, commands.get(parent)!);
      }
    } else {
      this.#log.warn('No Appium commands found in the entire project');
    }
  }

  /**
   * Creates and adds a child {@linkcode CommandReflection} to this reflection
   * @param data Command reference
   * @param route Route
   * @param parent Commands reflection
   */
  #createCommandReflection(
    ctx: Context,
    data: CommandData | ExecCommandData,
    parent: CommandsReflection,
    route?: Route
  ): void {
    const commandRefl = new CommandReflection(data, parent, route);
    /**
     * During "normal" usage of TypeDoc, one would call `createDeclarationReflection()`. But
     * since we've subclassed `DeclarationReflection`, we cannot call it directly.  It doesn't
     * seem to do anything useful besides instantiation then delegating to `postReflectionCreation()`;
     * so we just need to call it directly.
     *
     * Finally, we call `finalizeDeclarationReflection()` which I think just fires some events for other
     * plugins to potentially use.
     *
     * And yes, the `undefined`s are apparently needed.
     */
    ctx.postReflectionCreation(commandRefl, undefined, undefined);
    ctx.finalizeDeclarationReflection(commandRefl);
  }

  /**
   * Create a new {@linkcode CommandsReflection}
   * @param ctx - Current context
   * @param parent - Parent module (or project)
   * @param commandInfo - Command information for `module`
   */
  #createCommandsReflection(
    ctx: Context,
    parent: ParentReflection,
    commandInfo: CommandInfo
  ): CommandsReflection {
    // TODO: module.name may not be right here
    const commandsRefl = new CommandsReflection(parent.name, ctx.project, commandInfo);
    /**
     * See note in `#createCommandReflection` above about this call
     */
    ctx.postReflectionCreation(commandsRefl, undefined, undefined);

    const parentCtx = ctx.withScope(commandsRefl);
    const {routeMap: routeMap, execCommandDataSet: execCommandsData} = commandInfo;

    // sort routes in alphabetical order
    const sortedRouteMap = new Map([...routeMap.entries()].sort());
    for (const [route, commandMap] of sortedRouteMap) {
      for (const data of commandMap.values()) {
        this.#createCommandReflection(parentCtx, data, commandsRefl, route);
      }
    }

    // sort execute commands in alphabetical order
    const sortedExecCommandsData = new Set([...execCommandsData].sort());
    for (const data of sortedExecCommandsData) {
      this.#createCommandReflection(parentCtx, data, commandsRefl);
    }

    ctx.finalizeDeclarationReflection(commandsRefl);
    return commandsRefl;
  }
}

/**
 * Convenience function to instantiate a {@linkcode CommandTreeBuilder} and create relfections
 * @param ctx TypeDoc Context
 * @param log Plugin logger
 * @param commandInfo Command info from converter
 */
export function createReflections(
  ctx: Context,
  log: AppiumPluginLogger,
  commandInfo: ModuleCommands
): void {
  new CommandTreeBuilder(log).createReflections(ctx, commandInfo);
}
