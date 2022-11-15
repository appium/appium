import {CommandInfo} from '../command-info';
import {ExecuteCommandSet, ParentReflection, RouteMap} from '../types';

import {AppiumPluginReflectionKind} from './kind';
import {AppiumPluginReflection} from './plugin';

export class CommandsReflection extends AppiumPluginReflection {
  public readonly executeCommandRefs: ExecuteCommandSet;
  public readonly routeMap: RouteMap;

  constructor(
    name: string,
    module: ParentReflection,
    commands: CommandInfo,
    public override parent: ParentReflection = module
  ) {
    super(name, AppiumPluginReflectionKind.COMMANDS as any, module, parent);
    this.parent = parent;
    this.routeMap = commands.routes;
    this.executeCommandRefs = commands.executeCommands;
  }

  /**
   * Returns the name of the module to which this command belongs.
   *
   * @see {CommandTreeBuilder.getName}
   */
  public get moduleName(): string {
    return this.module.name;
  }

  public get hasExecuteCommands(): boolean {
    return Boolean(this.executeCommandRefs.size);
  }

  public get hasRoutes(): boolean {
    return Boolean(this.routeMap.size);
  }
}
