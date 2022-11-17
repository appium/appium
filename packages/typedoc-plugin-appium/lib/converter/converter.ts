import {Context, DeclarationReflection, LiteralType, ReflectionKind} from 'typedoc';
import {
  isBaseDriverDeclarationReflection,
  isCommandPropDeclarationReflection,
  isExecMethodDefReflection,
  isHTTPMethodDeclarationReflection,
  isMethodMapDeclarationReflection,
  isParamsArray,
  isReflectionWithReflectedType,
  isRoutePropDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {
  CommandInfo,
  CommandMap,
  ExecCommandDataSet,
  ModuleCommands,
  ParentReflection,
  RouteMap,
} from '../model';
import {
  BaseDriverDeclarationReflection,
  DeclarationReflectionWithReflectedType,
  Guard,
  MethodMapDeclarationReflection,
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
  #ctx: Context;
  #log: AppiumPluginLogger;

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
        if (cmdInfo.hasCommands) {
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

  #convertExecuteMethodMap(refl: DeclarationReflectionWithReflectedType): ExecCommandDataSet {
    const executeMethodMap = findChildByNameAndGuard(
      refl,
      NAME_EXECUTE_METHOD_MAP,
      isExecMethodDefReflection
    );
    const commandRefs: ExecCommandDataSet = new Set();
    if (executeMethodMap) {
      for (const newMethodProp of filterChildrenByKind(executeMethodMap, ReflectionKind.Property)) {
        const comment = newMethodProp.comment;
        const script = newMethodProp.originalName;
        const commandProp = findChildByNameAndGuard(
          newMethodProp,
          NAME_COMMAND,
          isCommandPropDeclarationReflection
        );
        if (commandProp) {
          const command = String(commandProp.type.value);
          const paramsProp = findChildByNameAndGuard(
            newMethodProp,
            NAME_PARAMS,
            isReflectionWithReflectedType
          );
          const requiredParams = this.#parseRequiredParams(paramsProp);
          const optionalParams = this.#parseOptionalParams(paramsProp);
          commandRefs.add({
            command,
            requiredParams,
            optionalParams,
            script,
            comment,
          });
        }
      }
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

    let methodMap: MethodMapDeclarationReflection;
    const child = isBaseDriverDeclarationReflection(refl)
      ? refl.getChildByName(NAME_METHOD_MAP)
      : refl.getChildByName(NAME_NEW_METHOD_MAP);

    if (isMethodMapDeclarationReflection(child)) {
      methodMap = child;
      const routeProps = filterChildrenByKind(methodMap, ReflectionKind.Property);

      if (!routeProps.length) {
        this.#log.warn(`No routes found in ${refl.name}`);
      }

      for (const routeProp of routeProps) {
        const route = routeProp.originalName;

        if (!isRoutePropDeclarationReflection(routeProp)) {
          this.#log.warn(`Empty route in ${refl.name}.${route}`);
          continue;
        }

        const httpMethodProps = filterChildrenByGuard(routeProp, isHTTPMethodDeclarationReflection);

        if (!httpMethodProps.length) {
          this.#log.warn(`No HTTP methods found in route ${refl.name}.${route}`);
          continue;
        }

        for (const httpMethodProp of httpMethodProps) {
          const comment = httpMethodProp.comment;
          const httpMethod = httpMethodProp.originalName;

          const commandProp = findChildByNameAndGuard(
            httpMethodProp,
            NAME_COMMAND,
            isCommandPropDeclarationReflection
          );

          // commandProp is optional.
          if (!commandProp) {
            continue;
          }

          const command = String(commandProp.type.value);
          const payloadParamsProp = findChildByNameAndGuard(
            httpMethodProp,
            NAME_PAYLOAD_PARAMS,
            isReflectionWithReflectedType
          );
          const requiredParams = this.#parseRequiredParams(payloadParamsProp);
          const optionalParams = this.#parseOptionalParams(payloadParamsProp);
          let commandMap: CommandMap = routes.get(route) ?? new Map();
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
    } else {
      this.#log.verbose(`No {MethodMap} found in class ${refl.name}`);
    }

    return routes;
  }

  #convertModuleClasses(parent: ParentReflection) {
    let routes: RouteMap = new Map();
    let executeCommands: ExecCommandDataSet = new Set();

    const classReflections = parent
      .getChildrenByKind(ReflectionKind.Class)
      .filter((child) =>
        isReflectionWithReflectedType(child)
      ) as DeclarationReflectionWithReflectedType[];

    for (const classRefl of classReflections) {
      this.#log.verbose(`Converting class ${classRefl.name}`);
      const newMethodMap = this.#convertMethodMap(classRefl);

      if (newMethodMap.size) {
        routes = new Map([...routes, ...newMethodMap]);
      }

      const executeMethodMap = this.#convertExecuteMethodMap(classRefl);
      if (executeMethodMap.size) {
        executeCommands = new Set([...executeCommands, ...executeMethodMap]);
      }
      this.#log.verbose(`Converted class ${classRefl.name}`);
    }

    return new CommandInfo(routes, executeCommands);
  }

  #parseOptionalParams(methodDefRefl?: DeclarationReflectionWithReflectedType): string[] {
    return this.#parseParams(NAME_OPTIONAL, methodDefRefl);
  }

  #parseParams(propName: string, refl?: DeclarationReflectionWithReflectedType): string[] {
    if (refl) {
      const props = findChildByNameAndGuard(refl, propName, isParamsArray);
      return props?.type.target.elements.map((el: LiteralType) => String(el.value)) ?? [];
    }
    return [];
  }

  #parseRequiredParams(methodDefRefl?: DeclarationReflectionWithReflectedType): string[] {
    return this.#parseParams(NAME_REQUIRED, methodDefRefl);
  }
}

export function convertCommands(ctx: Context, log: AppiumPluginLogger): ModuleCommands {
  return new CommandConverter(ctx, log).convert();
}

function findChildByNameAndGuard<T extends DeclarationReflection>(
  refl: DeclarationReflectionWithReflectedType,
  name: string,
  guard: Guard<T>
): T | undefined {
  return refl.type.declaration.children?.find((child) => child.name === name && guard(child)) as T;
}

function filterChildrenByKind(
  refl: DeclarationReflectionWithReflectedType,
  kind: ReflectionKind
): DeclarationReflectionWithReflectedType[] {
  return (refl.type.declaration.children?.filter(
    (child) => isReflectionWithReflectedType(child) && child.kindOf(kind)
  ) ?? []) as DeclarationReflectionWithReflectedType[];
}

function filterChildrenByGuard<T extends DeclarationReflection>(
  refl: DeclarationReflectionWithReflectedType,
  guard: Guard<T>
): T[] {
  return refl.type.declaration.children?.filter(guard) ?? [];
}
