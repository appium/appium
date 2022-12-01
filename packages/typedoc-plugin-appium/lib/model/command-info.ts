import {ExecMethodDataSet, RouteMap} from './types';

/**
 * Data structure describing routes and commands for a particular module (or project),
 * including execute methods (if any)
 */
export class CommandInfo {
  constructor(
    public readonly routeMap: RouteMap,
    public readonly execMethodDataSet: ExecMethodDataSet = new Set()
  ) {}

  /**
   * Returns `true` if this instance has some actual data
   */
  public get hasData() {
    return Boolean(this.execMethodDataSet.size + this.routeMap.size);
  }
}
