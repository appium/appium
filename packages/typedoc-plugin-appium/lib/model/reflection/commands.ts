import {CommandInfo} from '../command-info';
import {ExecCommandDataSet, ParentReflection, RouteMap} from '../types';

import {AppiumPluginReflectionKind} from './kind';
import {AppiumPluginReflection} from './plugin';

/**
 * A Reflection representing a set of commands within a module or project
 */
export class CommandsReflection extends AppiumPluginReflection {
  /**
   * A set of objects
   */
  public readonly execCommandDataSet: ExecCommandDataSet;
  public readonly routeMap: RouteMap;

  constructor(name: string, parent: ParentReflection, commands: CommandInfo) {
    super(name, AppiumPluginReflectionKind.COMMANDS as any, parent);
    this.parent = parent;
    this.routeMap = commands.routeMap;
    this.execCommandDataSet = commands.execCommandDataSet;
  }

  /**
   * Returns `true` if there are any "execute commands" in this set.
   *
   * Used by templates
   */
  public get hasExecuteCommands(): boolean {
    return Boolean(this.execCommandDataSet.size);
  }

  /**
   * Returns `true` if there are any "regular" commands in this set.
   *
   * Used by templates
   */
  public get hasRoutes(): boolean {
    return Boolean(this.routeMap.size);
  }
}
