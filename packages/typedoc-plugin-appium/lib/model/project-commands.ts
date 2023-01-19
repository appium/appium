import {ModuleCommands} from './module-commands';

/**
 * Represents all command data for a TypeDoc project, keyed by module/project name.
 *
 * This is a map which refuses to add values that have no command data.
 *
 * The key is later used to lookup the `Reflection` in the TypeDoc project context.
 */
export class ProjectCommands extends Map<string, ModuleCommands> {
  override set(moduleName: string, moduleCmds: ModuleCommands) {
    if (moduleCmds.hasData) {
      return super.set(moduleName, moduleCmds);
    }
    return this;
  }

  get isEmpty() {
    return this.size === 0;
  }
}
