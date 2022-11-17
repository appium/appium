import {ExecCommandDataSet, RouteMap} from './types';

/**
 * Data structure describing routes and commands for a particular module (or project)
 */
export class CommandInfo {
  constructor(
    public readonly routeMap: RouteMap,
    public readonly execCommandDataSet: ExecCommandDataSet = new Set()
  ) {}

  /**
   * `true` if this instance has some actual data
   */
  public get hasCommands() {
    return Boolean(this.execCommandDataSet.size + this.routeMap.size);
  }
}
