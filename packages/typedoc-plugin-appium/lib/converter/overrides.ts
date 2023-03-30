import _ from 'lodash';
import {Context, DeclarationReflection} from 'typedoc';
import {AppiumPluginLogger} from '../logger';
import {CommandData, CommandSet, ExecMethodDataSet, ModuleCommands, RouteMap} from '../model';
import {deriveComment} from './comment';
import {KnownMethods} from './types';

/**
 * Returns routes pulled from `builtinCommands` if the driver implements them as methods.
 *
 * This makes up for the fact that `newMethodMap` only defines _new_ methods, not ones that already
 * exist in `@appium/base-driver`.
 *
 * Sorry about all the arguments!
 * @param args Required arguments
 * @returns More routes pulled from `builtinCommands`, if the driver implements them
 */
export function convertOverrides({
  ctx,
  log,
  parentRefl,
  classMethods,
  builtinMethods,
  newRouteMap,
  newExecMethodMap,
  builtinCommands,
}: ConvertOverridesOpts): RouteMap {
  const routes: RouteMap = new Map();

  /**
   * All command/method names associated with execute methods
   */
  const execMethodNames = [...newExecMethodMap].map((execData) => execData.command);

  /**
   * All method names in the class
   */
  const methodNames = [...classMethods.keys()];

  /**
   * All methods in the class which are not associated with execute methods
   */
  const methodsLessExecCommands = _.difference(methodNames, execMethodNames);

  /**
   * All methods in the class within its `newMethodMap`
   */
  const methodsInMethodMap = [...newRouteMap.values()].flatMap((commandSet) =>
    [...commandSet].map((commandData) => commandData.command)
  );

  /**
   * All methods in the class which are not associated with execute methods nor the class' method map
   */
  const unknownMethods = new Set(_.difference(methodsLessExecCommands, methodsInMethodMap));

  // this discovers all of the ExternalDriver methods implemented in the driver class
  // and adds them to the routes map.
  for (const command of unknownMethods) {
    const builtinRoutes = builtinCommands.routesByCommandName.get(command);
    if (!builtinMethods.has(command) || !builtinRoutes) {
      // actually unknown method
      log.verbose('(%s) Method "%s" is not a registered command', parentRefl.name, command);
      continue;
    }

    // the method is in ExternalDriver, so remove it
    unknownMethods.delete(command);

    for (const route of builtinRoutes) {
      const newCommandSet: CommandSet = new Set();
      // this must be defined, because if it wasn't then builtinRoutes would be empty and we'd continue the loop
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const commandSet = builtinCommands.routeMap.get(route)!;
      for (const commandData of commandSet) {
        const methodRefl = classMethods.get(command);
        if (!methodRefl) {
          log.warn('(%s) No such method "%s"; this is a bug', parentRefl.name, command);
          continue;
        }
        const commentData = deriveComment({
          refl: methodRefl,
          knownMethods: builtinMethods,
        });
        const newCommandData = CommandData.clone(commandData, ctx, {
          methodRefl,
          parentRefl,
          knownBuiltinMethods: builtinMethods,
          opts: {
            comment: commentData?.comment,
          },
        });
        log.verbose(
          '(%s) Linked command "%s" to route %s %s',
          parentRefl.name,
          command,
          commandData.httpMethod,
          route
        );
        newCommandSet.add(newCommandData);
      }
      routes.set(route, newCommandSet);
    }
  }

  return routes;
}

/**
 * Options for {@link convertOverrides}
 */
export interface ConvertOverridesOpts {
  ctx: Context;
  /**
   * Logger
   */
  log: AppiumPluginLogger;
  /**
   * Project/module reflection
   */
  parentRefl: DeclarationReflection;
  /**
   * Methods in the class
   */
  classMethods: KnownMethods;
  /**
   * Methods in `@appium/base-driver`
   */
  builtinMethods: KnownMethods;
  /**
   * New routes in the class via `newMethodMap`
   */
  newRouteMap: RouteMap;
  /**
   * Execute methods in the class via `executeMethodMap`
   */
  newExecMethodMap: ExecMethodDataSet;
  /**
   * Routes in `@appium/base-driver`
   */
  builtinCommands: ModuleCommands;
}
