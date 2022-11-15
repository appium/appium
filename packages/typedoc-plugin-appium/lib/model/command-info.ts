import {ExecuteCommandSet, RouteMap} from './types';

/**
 * Data structure describing routes and commands for a particular module (or project)
 */
export class CommandInfo {
  constructor(
    public readonly routes: RouteMap,
    public readonly executeCommands: ExecuteCommandSet = new Set()
  ) {}

  /**
   * `true` if this instance has some actual data
   */
  public get hasCommands() {
    return this.executeCommands.size > 0 || this.routes.size > 0;
  }
}
