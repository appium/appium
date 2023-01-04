import {DeclarationReflection} from 'typedoc';
import {ModuleCommands} from '../module-commands';
import {ExecMethodDataSet, ParentReflection, RouteMap} from '../types';
import {AppiumPluginReflectionKind} from './kind';

/**
 * A reflection containing data about commands and/or execute methods.
 *
 * Methods may be invoked directly by Handlebars templates.
 */
export class ExtensionReflection extends DeclarationReflection {
  /**
   * Info about execute methods
   */
  public readonly execMethodDataSet: ExecMethodDataSet;
  /**
   * Info about routes/commands
   */
  public readonly routeMap: RouteMap;

  /**
   *
   * @param name Name of module containing commands
   * @param parent Module containing commands
   * @param moduleCommands Data containing commands and execute methods
   * @todo Determine the kind by inspecting `package.json` or smth
   */
  constructor(name: string, parent: ParentReflection, moduleCommands: ModuleCommands) {
    const {routeMap, execMethodDataSet} = moduleCommands;
    const kind = (
      name.includes('driver')
        ? AppiumPluginReflectionKind.Driver
        : name.includes('plugin')
        ? AppiumPluginReflectionKind.Plugin
        : AppiumPluginReflectionKind.Extension
    ) as any;
    super(name, kind, parent);
    this.parent = parent;
    this.routeMap = routeMap;
    this.execMethodDataSet = execMethodDataSet;
  }

  /**
   * Returns `true` if there are any "execute commands" in this set.
   *
   * Used by templates
   */
  public get hasExecuteMethod(): boolean {
    return Boolean(this.execMethodCount);
  }

  /**
   * Returns `true` if there are any "regular" commands in this set.
   *
   * Used by templates
   */
  public get hasRoute(): boolean {
    return Boolean(this.routeCount);
  }

  /**
   * Returns number of routes ("commands") in this in this data
   */
  public get routeCount(): number {
    return this.routeMap.size;
  }

  /**
   * Returns number of execute methods in this data
   */
  public get execMethodCount(): number {
    return this.execMethodDataSet.size;
  }
}
