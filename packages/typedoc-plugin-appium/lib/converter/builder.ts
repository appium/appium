import {Context, Logger, ReflectionKind} from 'typedoc';
import {AppiumPluginLogger} from '../logger';
import {
  CommandInfo,
  CommandRef,
  CommandReflection,
  CommandsReflection,
  ExecuteCommandRef,
  NAME_EXECUTE_ROUTE,
  ParentReflection,
  ProjectCommands,
  Route,
} from '../model';

export class CommandTreeBuilder {
  #log: AppiumPluginLogger;

  constructor(log: AppiumPluginLogger) {
    this.#log = log.createChildLogger('builder');
  }

  public createReflections(ctx: Context, commands: ProjectCommands): void {
    const {project} = ctx;
    const modules = project.getChildrenByKind(ReflectionKind.Module);
    const projectCmdInfo = commands.get(project);
    if (modules.length) {
      for (const module of modules) {
        const commandInfo = commands.get(module);
        if (commandInfo) {
          this.#createCommandsReflection(module, ctx, commandInfo);
        }
      }
    } else if (projectCmdInfo?.hasCommands) {
      this.#createCommandsReflection(project, ctx, projectCmdInfo);
    } else {
      this.#log.warn(`No commands found in project ${project.name}`);
    }
  }

  /**
   * Creates and adds a child {@linkcode CommandReflection} to this reflection
   * @param ref Command reference
   * @param route Route
   * @param parent Commands reflection
   */
  #createCommandReflection(
    ctx: Context,
    ref: CommandRef | ExecuteCommandRef,
    route: Route,
    parent: CommandsReflection
  ) {
    const commandReflection = new CommandReflection(ref, parent.parent, route, parent);
    ctx.postReflectionCreation(commandReflection, undefined, undefined);
    ctx.finalizeDeclarationReflection(commandReflection);
  }

  /**
   * Create a new {@linkcode CommandsReflection}
   * @param module - Parent module (or project)
   * @param ctx - Current context
   * @param commandInfo - Command information for `module`
   * @returns New {@linkcode CommandsReflection}
   */
  #createCommandsReflection(
    module: ParentReflection,
    ctx: Context,
    commandInfo: CommandInfo
  ): CommandsReflection {
    const commandsRef = new CommandsReflection(module.name, ctx.project, commandInfo, module);
    ctx.postReflectionCreation(commandsRef, undefined, undefined);

    const {routes, executeCommands} = commandInfo;

    // sort routes in alphabetical order
    const sortedRoutes = new Map([...routes.entries()].sort());
    for (const [route, commandMap] of sortedRoutes) {
      for (const ref of commandMap.values()) {
        this.#createCommandReflection(ctx.withScope(commandsRef), ref, route, commandsRef);
      }
    }

    // sort execute commands in alphabetical order
    const sortedExecuteCommands = new Set([...executeCommands].sort());
    for (const executeCommandRef of sortedExecuteCommands) {
      this.#createCommandReflection(
        ctx.withScope(commandsRef),
        executeCommandRef,
        NAME_EXECUTE_ROUTE,
        commandsRef
      );
    }

    ctx.finalizeDeclarationReflection(commandsRef);
    return commandsRef;
  }
}

export function createReflections(
  ctx: Context,
  log: AppiumPluginLogger,
  commands: ProjectCommands
): void {
  new CommandTreeBuilder(log).createReflections(ctx, commands);
}
