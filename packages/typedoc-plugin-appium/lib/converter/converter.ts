/**
 * Converts code parsed by TypeDoc into a data structure describing the commands and execute methods, which will later be used to create new {@linkcode DeclarationReflection} instances in the TypeDoc context.
 *
 * The logic in this module is highly dependent on Appium's extension API, and is further dependent on specific usages of TS types.  Anything that will be parsed successfully by this module must use a `const` type alias in TS parlance.  For example:
 *
 * ```ts
 * const METHOD_MAP = {
 *   '/status': {
 *     GET: {command: 'getStatus'}
 *   },
 *   // ...
 * } as const; // <-- required
 * ```
 * @module
 */

import _ from 'lodash';
import {Context, DeclarationReflection, LiteralType, ReflectionKind} from 'typedoc';
import {
  isBaseDriverDeclarationReflection,
  isCommandPropDeclarationReflection,
  isExecMethodDefReflection,
  isHTTPMethodDeclarationReflection,
  isMethodMapDeclarationReflection,
  isMethodDefParamNamesDeclarationReflection,
  isExecMethodDefParamsPropDeclarationReflection,
  isReflectionWithReflectedType,
  isRoutePropDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {
  CommandInfo,
  CommandMap,
  ExecMethodDataSet,
  ModuleCommands,
  ParentReflection,
  RouteMap,
} from '../model';
import {
  BaseDriverDeclarationReflection,
  DeclarationReflectionWithReflectedType,
  ExecMethodDeclarationReflection,
  Guard,
  MethodDefParamsPropDeclarationReflection,
} from './types';

/**
 * Name of the static `newMethodMap` property in a Driver
 */
export const NAME_NEW_METHOD_MAP = 'newMethodMap';

/**
 * Name of the static `executeMethodMap` property in a Driver
 */
export const NAME_EXECUTE_METHOD_MAP = 'executeMethodMap';

/**
 * Name of the builtin method map in `@appium/base-driver`
 */
export const NAME_METHOD_MAP = 'METHOD_MAP';

/**
 * Name of the field in a method map's parameters prop which contains required parameters
 */
export const NAME_REQUIRED = 'required';
/**
 * Name of the field in a method map's parameters prop which contains optional parameters
 */
export const NAME_OPTIONAL = 'optional';
/**
 * Name of the field in an _execute_ method map which contains parameters
 */
export const NAME_PARAMS = 'params';
/**
 * Name of the command in a method map
 */
export const NAME_COMMAND = 'command';

/**
 * Name of the field in a _regular_ method map which contains parameters
 */
export const NAME_PAYLOAD_PARAMS = 'payloadParams';

/**
 * Name of the module which contains the builtin method map
 */
export const NAME_BUILTIN_COMMAND_MODULE = '@appium/base-driver';

/**
 * Converts declarations to information about Appium commands
 */
export class CommandConverter {
  /**
   * The project context of TypeDoc
   */
  #ctx: Context;

  /**
   * Custom logger
   */
  #log: AppiumPluginLogger;

  /**
   * Creates a child logger for this instance
   * @param ctx Typedoc Context
   * @param log Logger
   */
  constructor(ctx: Context, log: AppiumPluginLogger) {
    this.#ctx = ctx;
    this.#log = log.createChildLogger('converter');
  }

  /**
   * Converts declarations into command information
   *
   * @returns Command info for entire project
   */
  public convert(): ModuleCommands {
    const ctx = this.#ctx;
    const {project} = ctx;
    const projectCommands: ModuleCommands = new Map();

    // handle baseDriver if it's present
    const baseDriver = project.getChildByName(NAME_BUILTIN_COMMAND_MODULE);
    if (baseDriver && isBaseDriverDeclarationReflection(baseDriver)) {
      this.#log.verbose('Found %s', NAME_BUILTIN_COMMAND_MODULE);
      projectCommands.set(baseDriver, this.#convertBaseDriver(baseDriver));
    } else {
      this.#log.verbose('Did not find %s', NAME_BUILTIN_COMMAND_MODULE);
    }

    // convert all modules (or just project if no modules)
    const modules = project.getChildrenByKind(ReflectionKind.Module);
    if (modules.length) {
      for (const mod of modules) {
        this.#log.verbose('Converting module %s', mod.name);
        const cmdInfo = this.#convertModuleClasses(mod);
        if (cmdInfo.hasData) {
          projectCommands.set(mod, this.#convertModuleClasses(mod));
        }
        this.#log.info('Converted module %s', mod.name);
      }
    } else {
      projectCommands.set(project, this.#convertModuleClasses(project));
    }

    this.#log.info('Found commands in %d module(s)', projectCommands.size);

    return projectCommands;
  }

  #convertBaseDriver(baseDriver: BaseDriverDeclarationReflection): CommandInfo {
    const baseDriverRoutes = this.#convertMethodMap(baseDriver);
    if (!baseDriverRoutes.size) {
      throw new TypeError(`Could not find any commands in BaseDriver!?`);
    }

    // no execute commands in BaseDriver
    return new CommandInfo(baseDriverRoutes);
  }

  /**
   * Finds names of parameters of a command in a method def
   * @param propName Either required or optional params
   * @param refl Parent reflection (`params` prop of method def)
   * @returns List of parameter names
   */

  #convertCommandParams(
    propName: typeof NAME_OPTIONAL | typeof NAME_REQUIRED,
    refl?: MethodDefParamsPropDeclarationReflection
  ): string[] {
    if (!refl) {
      return [];
    }
    const props = findChildByNameAndGuard(
      refl,
      propName,
      isMethodDefParamNamesDeclarationReflection
    );
    const names = props?.type.target.elements.map((el: LiteralType) => String(el.value)) ?? [];
    return names.filter((name) => {
      if (!name) {
        this.#log.warn('Found empty %s parameter', propName);
        return false;
      }
      return true;
    });
  }

  /**
   * Gathers info about an `executeMethodMap` prop in a driver
   * @param refl A class which may contain an `executeMethodMap` static property
   * @returns List of "execute commands", if any
   */
  #convertExecuteMethodMap(refl: DeclarationReflection): ExecMethodDataSet {
    const executeMethodMap = findChildByGuard(refl, isExecMethodDefReflection);

    const commandRefs: ExecMethodDataSet = new Set();
    if (!executeMethodMap) {
      // no execute commands in this class
      return commandRefs;
    }

    const newMethodProps = filterChildrenByKind(executeMethodMap, ReflectionKind.Property);
    for (const newMethodProp of newMethodProps) {
      const {comment, originalName: script} = newMethodProp;

      const commandProp = findChildByGuard(newMethodProp, isCommandPropDeclarationReflection);

      if (!commandProp) {
        // this is unusual
        this.#log.warn(
          'Execute method map in %s has no "command" property for %s',
          refl.name,
          script
        );
        continue;
      }

      if (!_.isString(commandProp.type.value) || _.isEmpty(commandProp.type.value)) {
        this.#log.warn(
          'Execute method map in %s has an empty or invalid "command" property for %s',
          refl.name,
          script
        );
        continue;
      }
      const command = String(commandProp.type.value);

      const paramsProp = findChildByGuard(
        newMethodProp,
        isExecMethodDefParamsPropDeclarationReflection
      );
      const requiredParams = this.#convertRequiredCommandParams(paramsProp);
      const optionalParams = this.#convertOptionalCommandParams(paramsProp);
      commandRefs.add({
        command,
        requiredParams,
        optionalParams,
        script,
        comment,
      });
    }
    return commandRefs;
  }

  /**
   * Extracts information about `MethodMap` objects
   * @param refl - Some reflection we want to inspect. Could refer to a module or a class
   * @returns Lookup of routes to {@linkcode CommandMap} objects
   */
  #convertMethodMap(refl: DeclarationReflection): RouteMap {
    const routes: RouteMap = new Map();

    const methodMap = isBaseDriverDeclarationReflection(refl)
      ? refl.getChildByName(NAME_METHOD_MAP)
      : refl.getChildByName(NAME_NEW_METHOD_MAP);

    if (!isMethodMapDeclarationReflection(methodMap)) {
      // this is not unusual
      this.#log.verbose('No {MethodMap} found in class %s', refl.name);
      return routes;
    }

    const routeProps = filterChildrenByKind(methodMap, ReflectionKind.Property);

    if (!routeProps.length) {
      this.#log.warn('No routes found in {MethodMap} of class %s', refl.name);
      return routes;
    }

    for (const routeProp of routeProps) {
      const {originalName: route} = routeProp;

      if (!isRoutePropDeclarationReflection(routeProp)) {
        this.#log.warn('Empty route in %s.%s', refl.name, route);
        continue;
      }

      const httpMethodProps = filterChildrenByGuard(routeProp, isHTTPMethodDeclarationReflection);

      if (!httpMethodProps.length) {
        this.#log.warn('No HTTP methods found in route %s.%s', refl.name, route);
        continue;
      }

      for (const httpMethodProp of httpMethodProps) {
        const {comment, originalName: httpMethod} = httpMethodProp;

        const commandProp = findChildByGuard(httpMethodProp, isCommandPropDeclarationReflection);

        // commandProp is optional.
        if (!commandProp) {
          continue;
        }

        if (!_.isString(commandProp.type.value) || _.isEmpty(commandProp.type.value)) {
          this.#log.warn('Empty command name found in %s.%s.%s', refl.name, route, httpMethod);
          continue;
        }
        const command = String(commandProp.type.value);

        const payloadParamsProp = findChildByGuard(
          httpMethodProp,
          isExecMethodDefParamsPropDeclarationReflection
        );
        const requiredParams = this.#convertRequiredCommandParams(payloadParamsProp);
        const optionalParams = this.#convertOptionalCommandParams(payloadParamsProp);

        const commandMap: CommandMap = routes.get(route) ?? new Map();

        commandMap.set(command, {
          command,
          requiredParams,
          optionalParams,
          httpMethod,
          route,
          comment,
        });

        routes.set(route, commandMap);
      }
    }

    return routes;
  }

  /**
   * Finds commands in all classes within a project or module
   * @param parent - Project or module
   * @returns Info about the commands in given `parent`
   */
  #convertModuleClasses(parent: ParentReflection) {
    let routes: RouteMap = new Map();
    let executeMethods: ExecMethodDataSet = new Set();

    const classReflections = parent.getChildrenByKind(ReflectionKind.Class);

    for (const classRefl of classReflections) {
      this.#log.verbose('Converting class %s', classRefl.name);
      const newMethodMap = this.#convertMethodMap(classRefl);

      if (newMethodMap.size) {
        routes = new Map([...routes, ...newMethodMap]);
      }

      const executeMethodMap = this.#convertExecuteMethodMap(classRefl);
      if (executeMethodMap.size) {
        executeMethods = new Set([...executeMethods, ...executeMethodMap]);
      }
      this.#log.verbose('Converted class %s', classRefl.name);
    }

    return new CommandInfo(routes, executeMethods);
  }

  /**
   * Finds "optional" params in a method definition
   * @param methodDefRefl - Reflection of a method definition
   * @returns List of optional parameters
   */
  #convertOptionalCommandParams(
    methodDefRefl?: MethodDefParamsPropDeclarationReflection
  ): string[] {
    return this.#convertCommandParams(NAME_OPTIONAL, methodDefRefl);
  }

  /**
   * Finds "required" params in a method definition
   * @param methodDefRefl - Reflection of a method definition
   * @returns List of required parameters
   */
  #convertRequiredCommandParams(
    methodDefRefl?: MethodDefParamsPropDeclarationReflection
  ): string[] {
    return this.#convertCommandParams(NAME_REQUIRED, methodDefRefl);
  }
}

/**
 * Converts declarations into information about the commands found within
 * @param ctx - Current TypeDoc context
 * @param log - Logger
 * @returns All commands found in the project
 */
export function convertCommands(ctx: Context, log: AppiumPluginLogger): ModuleCommands {
  return new CommandConverter(ctx, log).convert();
}

/**
 * Finds a child of a reflection by name and type guard
 * @param refl - Reflection to check
 * @param name - Name of child
 * @param guard - Guard function to check child
 * @returns Child if found, `undefined` otherwise
 * @internal
 */
function findChildByNameAndGuard<T extends DeclarationReflection, G extends DeclarationReflection>(
  refl: T,
  name: string,
  guard: Guard<G>
): G | undefined {
  return (
    isReflectionWithReflectedType(refl)
      ? refl.type.declaration.children?.find((child) => child.name === name && guard(child))
      : refl.children?.find((child) => child.name === name && guard(child))
  ) as G | undefined;
}

/**
 * Finds a child of a reflection by type guard
 * @param refl - Reflection to check
 * @param guard - Guard function to check child
 * @returns Child if found, `undefined` otherwise
 * @internal
 */
function findChildByGuard<T extends DeclarationReflection, G extends DeclarationReflection>(
  refl: T,
  guard: Guard<G>
): G | undefined {
  return (
    isReflectionWithReflectedType(refl)
      ? refl.type.declaration.children?.find(guard)
      : refl.children?.find(guard)
  ) as G | undefined;
}

/**
 * Filters children of a reflection by kind and whether they are of type {@linkcode DeclarationReflectionWithReflectedType}
 * @param refl - Reflection to check
 * @param kind - Kind of child
 * @returns Filtered children, if any
 * @internal
 */
function filterChildrenByKind<T extends DeclarationReflection>(
  refl: T,
  kind: ReflectionKind
): DeclarationReflection[] {
  return (
    (isReflectionWithReflectedType(refl)
      ? refl.type.declaration.getChildrenByKind(kind)
      : refl.getChildrenByKind(kind)) ?? ([] as DeclarationReflection[])
  );
}

/**
 * Filters children by a type guard
 * @param refl - Reflection to check
 * @param guard - Type guard function
 * @returns Filtered children, if any
 * @internal
 */
function filterChildrenByGuard<T extends DeclarationReflection, G extends DeclarationReflection>(
  refl: T,
  guard: Guard<G>
): G[] {
  return (
    (isReflectionWithReflectedType(refl)
      ? refl.type.declaration.children?.filter(guard)
      : refl.children?.filter(guard)) ?? ([] as G[])
  );
}
