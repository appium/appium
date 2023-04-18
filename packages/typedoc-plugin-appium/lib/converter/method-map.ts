import _ from 'lodash';
import {Context, DeclarationReflection, ReflectionKind} from 'typedoc';
import {
  isCommandPropDeclarationReflection,
  isHTTPMethodDeclarationReflection,
  isMethodDefParamsPropDeclarationReflection,
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
  ctx: Context;
  /**
   * All builtin methods from `@appium/types`
   */
  knownBuiltinMethods: KnownMethods;
  /**
   * Logger
   */
  log: AppiumPluginLogger;
  /**
   * A `MethodMap` object whose parent is `parentRefl`
   */
  methodMapRefl: MethodMapDeclarationReflection;
  /**
   * All async methods in `parentRefl`
   */
  knownClassMethods: KnownMethods;
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
  ctx,
  log,
  methodMapRefl,
  parentRefl,
  knownClassMethods,
  knownBuiltinMethods,
  strict = false,
  isPluginCommand = false,
}: ConvertMethodMapOpts): RouteMap {
  const routes: RouteMap = new Map();

  const routeProps = filterChildrenByKind(methodMapRefl, ReflectionKind.Property);

  if (!routeProps.length) {
    if (methodMapRefl.overwrites?.name === 'BasePlugin') {
      log.warn('(%s) MethodMap; skipping');
    }
    return routes;
  }

  for (const routeProp of routeProps) {
    const {originalName: route} = routeProp;

    if (!isRoutePropDeclarationReflection(routeProp)) {
      log.warn('Empty route: %s', route);
      continue;
    }

    const httpMethodProps = filterChildrenByGuard(routeProp, isHTTPMethodDeclarationReflection);

    if (!httpMethodProps.length) {
      log.warn('No HTTP methods found in route %s', route);
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
        log.warn('Empty command name found in %s - %s', route, httpMethod);
        continue;
      }

      const command = String(commandProp.type.value);

      const method = knownClassMethods.get(command);

      if (!method) {
        if (strict) {
          log.error(
            '(%s) No method found for command "%s"; this may be a bug',
            parentRefl.name,
            command
          );
        }
        continue;
      }

      const commentData = deriveComment({
        refl: method,
        comment: mapComment,
        knownMethods: knownBuiltinMethods,
      });
      const {comment, commentSource} = commentData ?? {};

      const payloadParamsProp = findChildByGuard(
        httpMethodProp,
        isMethodDefParamsPropDeclarationReflection
      );

      const requiredParams = convertRequiredCommandParams(payloadParamsProp);
      const optionalParams = convertOptionalCommandParams(payloadParamsProp);

      const commandSet: CommandSet = routes.get(route) ?? new Set();

      const commandData = CommandData.create(ctx, log, command, method, httpMethod, route, {
        requiredParams,
        optionalParams,
        comment,
        commentSource,
        parentRefl,
        isPluginCommand,
        knownBuiltinMethods,
      });

      commandSet.add(commandData);

      log.verbose(
        '(%s) Registered route %s %s for command "%s"',
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
