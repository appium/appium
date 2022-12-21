import {Command, ExecMethodDataSet, Route, RouteMap} from './types';

/**
 * Data structure describing routes and commands for a particular module (which may be the entire project),
 * including execute methods (if any)
 */
export class ModuleCommands {
  public readonly routesByCommandName: Map<Command, Set<Route>>;
  constructor(
    public readonly routeMap: RouteMap = new Map(),
    public readonly execMethodDataSet: ExecMethodDataSet = new Set()
  ) {
    this.routesByCommandName = new Map();

    for (const [route, commandSet] of routeMap) {
      for (const {command} of commandSet) {
        const routes = this.routesByCommandName.get(command) ?? new Set();
        routes.add(route);
        this.routesByCommandName.set(command, routes);
      }
    }
  }

  /**
   * Returns `true` if this instance has some actual data
   */
  public get hasData() {
    return Boolean(this.execMethodDataSet.size + this.routeMap.size);
  }
}
