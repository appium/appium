import _ from 'lodash';
import {DeclarationReflection, ReflectionKind} from 'typedoc';
import {
  isCommandPropDeclarationReflection,
  isExecMethodDefParamsPropDeclarationReflection,
  isHTTPMethodDeclarationReflection,
  isRoutePropDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {CommandData, CommandSet, RouteMap} from '../model';
import {deriveComment} from './comment';
import {KnownMethods, MethodMapDeclarationReflection} from './types';
import {
  convertOptionalCommandParams,
  convertRequiredCommandParams,
  filterChildrenByGuard,
  filterChildrenByKind,
  findChildByGuard,
} from './utils';

/**
 * Options for {@linkcode convertMethodMap}
 */
export interface ConvertMethodMapOpts {
  /**
   * All builtin methods from `@appium/types`
   */
  knownMethods?: KnownMethods;
  /**
   * Logger
   */
  log: AppiumPluginLogger;
  /**
   * A `MethodMap` object whose parent is `parentRefl`
   */
  methodMapRef: MethodMapDeclarationReflection;
  /**
   * All async methods in `parentRefl`
   */
  methods: KnownMethods;
  /**
   * The parent of `methodMapRef`; could be a class or module
   */
  parentRefl: DeclarationReflection;
  /**
   * If `true`, do not add a route if the method it references cannot be found
   */
  strict?: boolean;

  /**
   * If `true`, handle commands as `PluginCommand`s, which affects which parameters get used
   */
  isPluginCommand?: boolean;
}

/**
 * Extracts information about `MethodMap` objects
 * @param opts Options
 * @returns Lookup of routes to {@linkcode CommandSet} objects
 */
export function convertMethodMap({
  log,
  methodMapRef,
  parentRefl,
  methods,
  knownMethods = new Map(),
  strict = false,
  isPluginCommand = false,
}: ConvertMethodMapOpts): RouteMap {
  const routes: RouteMap = new Map();

  const routeProps = filterChildrenByKind(methodMapRef, ReflectionKind.Property);

  if (!routeProps.length) {
    log.warn('(%s) No routes found in MethodMap; skipping', parentRefl.name);
    return routes;
  }

  for (const routeProp of routeProps) {
    const {originalName: route} = routeProp;

    if (!isRoutePropDeclarationReflection(routeProp)) {
      log.warn('Empty route in %s.%s', parentRefl.name, route);
      continue;
    }

    const httpMethodProps = filterChildrenByGuard(routeProp, isHTTPMethodDeclarationReflection);

    if (!httpMethodProps.length) {
      log.warn('No HTTP methods found in route %s.%s', parentRefl.name, route);
      continue;
    }

    for (const httpMethodProp of httpMethodProps) {
      const {comment: mapComment, name: httpMethod} = httpMethodProp;

      const commandProp = findChildByGuard(httpMethodProp, isCommandPropDeclarationReflection);

      // commandProp is optional.
      if (!commandProp) {
        continue;
      }

      if (!_.isString(commandProp.type.value) || _.isEmpty(commandProp.type.value)) {
        log.warn('Empty command name found in %s.%s.%s', parentRefl.name, route, httpMethod);
        continue;
      }

      const command = String(commandProp.type.value);

      const method = methods.get(command)?.method;

      if (strict && !method) {
        log.error('(%s) No method found for command "%s"', parentRefl.name, command);
        continue;
      }

      const commentData = deriveComment(command, knownMethods, method, mapComment);

      const payloadParamsProp = findChildByGuard(
        httpMethodProp,
        isExecMethodDefParamsPropDeclarationReflection
      );

      const requiredParams = convertRequiredCommandParams(payloadParamsProp);
      const optionalParams = convertOptionalCommandParams(payloadParamsProp);

      const commandSet: CommandSet = routes.get(route) ?? new Set();

      commandSet.add(
        new CommandData(log, command, httpMethod, route, {
          requiredParams,
          optionalParams,
          comment: commentData?.comment,
          commentSource: commentData?.commentSource,
          refl: method,
          parentRefl,
          isPluginCommand,
        })
      );

      log.verbose(
        '(%s) Added %s route %s for command "%s"',
        parentRefl.name,
        httpMethod,
        route,
        command
      );

      routes.set(route, commandSet);
    }
  }

  return routes;
}
