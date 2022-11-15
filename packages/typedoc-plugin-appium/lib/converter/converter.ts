import {Context, DeclarationReflection, Logger, ReflectionKind} from 'typedoc';
import {AppiumPluginLogger} from '../logger';
import {
  AllowedHttpMethod,
  CommandInfo,
  CommandMap,
  ExecuteCommandSet,
  ParentReflection,
  ProjectCommands,
  RouteMap,
} from '../model';
import {
  isDeclarationReflection,
  isIntrinsicType,
  isLiteralType,
  isReflectionType,
  isTupleType,
  isTypeOperatorType,
} from '../guards';
import {BaseDriverDeclarationReflection, MethodMapDeclarationReflection} from './types';

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

function isBaseDriverDeclarationReflection(value: any): value is BaseDriverDeclarationReflection {
  return (
    value instanceof DeclarationReflection &&
    value.name === NAME_BUILTIN_COMMAND_MODULE &&
    value.kindOf(ReflectionKind.Module)
  );
}

function isMethodMapDeclarationReflection(value: any): value is MethodMapDeclarationReflection {
  return (
    isDeclarationReflection(value) &&
    ((value.name === NAME_NEW_METHOD_MAP && value.flags.isStatic) ||
      value.name === NAME_METHOD_MAP) &&
    isReflectionType(value.type) &&
    isDeclarationReflection(value.type.declaration)
  );
}
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
  public convert(): ProjectCommands {
    const ctx = this.#ctx;
    const {project} = ctx;
    const projectCommands: ProjectCommands = new Map();

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

  #convertExecuteMethodMap(refl: DeclarationReflection): ExecuteCommandSet {
    const executeMethodMap = refl.getChildByName(NAME_EXECUTE_METHOD_MAP);
    const commandRefs: ExecuteCommandSet = new Set();
    if (
      executeMethodMap?.flags.isStatic &&
      isDeclarationReflection(executeMethodMap) &&
      isReflectionType(executeMethodMap.type)
    ) {
      for (const newMethodProp of executeMethodMap.type.declaration.getChildrenByKind(
        ReflectionKind.Property
      )) {
        const comment = newMethodProp.comment;
        const script = newMethodProp.originalName;
        if (isDeclarationReflection(newMethodProp) && isReflectionType(newMethodProp.type)) {
          const commandProp = newMethodProp.type.declaration.getChildByName(NAME_COMMAND);
          if (isDeclarationReflection(commandProp) && isLiteralType(commandProp.type)) {
            const command = String(commandProp.type.value);
            const paramsProp = newMethodProp.type.declaration.getChildByName(NAME_PARAMS);
            let requiredParams: string[] = [];
            let optionalParams: string[] = [];
            if (isDeclarationReflection(paramsProp)) {
              requiredParams = this.#parseRequiredParams(paramsProp);
              optionalParams = this.#parseOptionalParams(paramsProp);
            }
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
      const routeProps = methodMap.type.declaration.getChildrenByKind(ReflectionKind.Property);
      if (!routeProps.length) {
        this.#log.warn(`No routes found in ${refl.name}`);
      }
      for (const routeProp of routeProps) {
        const route = routeProp.originalName;
        if (isDeclarationReflection(routeProp) && isReflectionType(routeProp.type)) {
          const httpMethodProps = routeProp.type.declaration.getChildrenByKind(
            ReflectionKind.Property
          );
          if (!httpMethodProps.length) {
            this.#log.warn(`No HTTP methods found in route ${refl.name}.${route}`);
          }
          for (const httpMethodProp of httpMethodProps) {
            const comment = httpMethodProp.comment;
            const httpMethod = httpMethodProp.originalName as AllowedHttpMethod;
            if (isDeclarationReflection(httpMethodProp) && isReflectionType(httpMethodProp.type)) {
              const commandProp = httpMethodProp.type.declaration.getChildByName(NAME_COMMAND);
              // commandProp is optional.
              if (commandProp) {
                if (isDeclarationReflection(commandProp) && isLiteralType(commandProp.type)) {
                  const command = String(commandProp.type.value);
                  const payloadParamsProp =
                    httpMethodProp.type.declaration.getChildByName(NAME_PAYLOAD_PARAMS);
                  let requiredParams: string[] = [];
                  let optionalParams: string[] = [];
                  if (isDeclarationReflection(payloadParamsProp)) {
                    requiredParams = this.#parseRequiredParams(payloadParamsProp);
                    optionalParams = this.#parseOptionalParams(payloadParamsProp);
                  }
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
                } else if (
                  isDeclarationReflection(commandProp) &&
                  isIntrinsicType(commandProp.type)
                ) {
                  this.#log.warn(
                    `Found intrinsic type for ${commandProp.originalName} ("${commandProp.type.name}").  ${refl.name} must be defined "as const" to associate with a method.`
                  );
                } else {
                  this.#log.warn(
                    `Found unknown type for ${commandProp.originalName}: ${commandProp}`
                  );
                }
              }
            } else {
              this.#log.warn(`Invalid {MethodMap} found in ${refl.name}.${route}.${httpMethod}`);
            }
          }
        } else {
          this.#log.warn(`Empty route in ${refl.name}.${route}`);
        }
      }
    } else {
      this.#log.verbose(`No {MethodMap} found in class ${refl.name}`);
    }

    return routes;
  }

  #convertModuleClasses(mod: ParentReflection) {
    let routes: RouteMap = new Map();
    let executeCommands: ExecuteCommandSet = new Set();

    const classReflections = mod.getChildrenByKind(ReflectionKind.Class);
    for (const classRef of classReflections) {
      this.#log.verbose(`Converting class ${classRef.name}`);
      const newMethodMap = this.#convertMethodMap(classRef);

      if (newMethodMap.size) {
        routes = new Map([...routes, ...newMethodMap]);
      }

      const executeMethodMap = this.#convertExecuteMethodMap(classRef);
      if (executeMethodMap.size) {
        executeCommands = new Set([...executeCommands, ...executeMethodMap]);
      }
      this.#log.verbose(`Converted class ${classRef.name}`);
    }

    return new CommandInfo(routes, executeCommands);
  }

  #parseOptionalParams(prop: DeclarationReflection): string[] {
    return this.#parseParams(prop, NAME_OPTIONAL);
  }

  #parseParams(prop: DeclarationReflection, name: string): string[] {
    const params = [];
    if (isReflectionType(prop.type)) {
      const requiredProp = prop.type.declaration.getChildByName(name);
      if (
        isDeclarationReflection(requiredProp) &&
        isTypeOperatorType(requiredProp.type) &&
        isTupleType(requiredProp.type.target)
      ) {
        for (const reqd of requiredProp.type.target.elements) {
          if (isLiteralType(reqd)) {
            params.push(String(reqd.value));
          }
        }
      }
    }
    return params;
  }

  #parseRequiredParams(prop: DeclarationReflection): string[] {
    return this.#parseParams(prop, NAME_REQUIRED);
  }
}

export function convertCommands(ctx: Context, log: AppiumPluginLogger): ProjectCommands {
  return new CommandConverter(ctx, log).convert();
}
