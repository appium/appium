import {BIDI_COMMANDS as BASE_BIDI_COMMANDS, METHOD_MAP as BASE_METHOD_MAP} from '@appium/base-driver';
import type {
  BiDiCommandItemParam,
  BiDiCommandNamesToInfosMap,
  BiDiCommandsMap,
  BidiMethodParams,
  BidiModuleMap,
  DriverClass,
  ExecuteMethodMap,
  ListCommandsResponse,
  ListExtensionsResponse,
  MethodMap,
  PayloadParams,
  PluginClass,
  RestCommandItemParam,
  RestMethodsToCommandsMap,
} from '@appium/types';
import type {AppiumDriver} from './appium';
import {mapValues} from './utils';

/**
 * Returns available REST and BiDi commands for base, driver and plugins.
 */
export async function listCommands(this: AppiumDriver, sessionId?: string): Promise<ListCommandsResponse> {
  let driverRestMethodMap: MethodMap<any> = {};
  let driverBiDiCommands: BidiModuleMap = {};
  let pluginRestMethodMaps: Record<string, MethodMap<any>> = {};
  let pluginBiDiCommands: Record<string, BidiModuleMap> = {};
  if (sessionId) {
    const driverClass = this.driverForSession(sessionId)?.constructor as DriverClass | undefined;
    driverRestMethodMap = driverClass?.newMethodMap ?? {};
    driverBiDiCommands = driverClass?.newBidiCommands ?? {};
    const pluginClasses = this.pluginsForSession(sessionId).map((p) => p.constructor as PluginClass);
    pluginRestMethodMaps = Object.fromEntries(pluginClasses.map((c) => [c.name, c.newMethodMap ?? {}]));
    pluginBiDiCommands = Object.fromEntries(pluginClasses.map((c) => [c.name, c.newBidiCommands ?? {}]));
  }
  return {
    rest: {
      base: methodMapToRestCommandsInfo(BASE_METHOD_MAP),
      driver: methodMapToRestCommandsInfo(driverRestMethodMap),
      plugins: pluginRestMethodMaps ? mapValues(pluginRestMethodMaps, methodMapToRestCommandsInfo) : undefined,
    },
    bidi: toBiDiCommandsMap(BASE_BIDI_COMMANDS, driverBiDiCommands, pluginBiDiCommands),
  };
}

/**
 * Returns available execute methods exposed by driver and plugins.
 */
export async function listExtensions(this: AppiumDriver, sessionId?: string): Promise<ListExtensionsResponse> {
  let driverExecuteMethodMap: ExecuteMethodMap<any> = {};
  let pluginExecuteMethodMaps: Record<string, ExecuteMethodMap<any>> = {};
  if (sessionId) {
    const driverClass = this.driverForSession(sessionId)?.constructor as DriverClass | undefined;
    driverExecuteMethodMap = driverClass?.executeMethodMap ?? {};
    const pluginClasses = this.pluginsForSession(sessionId).map((p) => p.constructor as PluginClass);
    pluginExecuteMethodMaps = Object.fromEntries(pluginClasses.map((c) => [c.name, c.executeMethodMap ?? {}]));
  }
  return {
    rest: {
      driver: executeMethodMapToCommandsInfo(driverExecuteMethodMap),
      plugins: pluginExecuteMethodMaps ? mapValues(pluginExecuteMethodMaps, executeMethodMapToCommandsInfo) : undefined,
    },
  };
}

function toRestCommandParams(params: PayloadParams | undefined): RestCommandItemParam[] | undefined {
  if (!params) {
    return;
  }

  const toRestCommandItemParam = (x: any, isRequired: boolean): RestCommandItemParam | undefined => {
    const isNameAnArray = Array.isArray(x);
    const name = isNameAnArray ? x[0] : x;
    if (typeof name !== 'string') {
      return;
    }

    // If parameter names are arrays then this means
    // either of them is required.
    // Not sure we could reflect that in here.
    const required = isRequired && !isNameAnArray;
    return {
      name,
      required,
    };
  };

  const requiredParams: RestCommandItemParam[] = (params.required ?? [])
    .map((name: any) => toRestCommandItemParam(name, true))
    .filter((x): x is RestCommandItemParam => x !== undefined);
  const optionalParams: RestCommandItemParam[] = (params.optional ?? [])
    .map((name: any) => toRestCommandItemParam(name, false))
    .filter((x): x is RestCommandItemParam => x !== undefined);
  return requiredParams.length || optionalParams.length ? [...requiredParams, ...optionalParams] : undefined;
}

function methodMapToRestCommandsInfo(mm: MethodMap<any>): Record<string, RestMethodsToCommandsMap> {
  const res: Record<string, RestMethodsToCommandsMap> = {};
  for (const [uriPath, methods] of Object.entries(mm)) {
    const methodsMap: RestMethodsToCommandsMap = {};
    for (const [method, spec] of Object.entries(methods)) {
      methodsMap[String(method)] = {
        command: spec.command as string,
        deprecated: spec.deprecated,
        info: spec.info,
        params: toRestCommandParams(spec.payloadParams),
      };
    }
    res[uriPath] = methodsMap;
  }
  return res;
}

function executeMethodMapToCommandsInfo(emm: ExecuteMethodMap<any>): RestMethodsToCommandsMap {
  const result: RestMethodsToCommandsMap = {};
  for (const [name, info] of Object.entries(emm)) {
    result[name] = {
      command: info.command as string,
      deprecated: info.deprecated,
      info: info.info,
      params: toRestCommandParams(info.params),
    };
  }
  return result;
}

function toBiDiCommandsMap(
  baseModuleMap: BidiModuleMap,
  driverModuleMap: BidiModuleMap,
  pluginModuleMaps: Record<string, BidiModuleMap>,
): BiDiCommandsMap {
  const toBiDiCommandParams = (params: BidiMethodParams | undefined): BiDiCommandItemParam[] | undefined => {
    if (!params) {
      return;
    }

    const toBiDiCommandItemParam = (x: any, isRequired: boolean): BiDiCommandItemParam | undefined => {
      const isNameAnArray = Array.isArray(x);
      const name = isNameAnArray ? x[0] : x;
      if (typeof name !== 'string') {
        return;
      }

      // If parameter names are arrays then this means
      // either of them is required.
      // Not sure we could reflect that in here.
      const required = isRequired && !isNameAnArray;
      return {
        name,
        required,
      };
    };

    const requiredParams: BiDiCommandItemParam[] = (params.required ?? [])
      .map((name) => toBiDiCommandItemParam(name, true))
      .filter((x): x is BiDiCommandItemParam => x !== undefined);
    const optionalParams: BiDiCommandItemParam[] = (params.optional ?? [])
      .map((name) => toBiDiCommandItemParam(name, false))
      .filter((x): x is BiDiCommandItemParam => x !== undefined);
    return requiredParams.length || optionalParams.length ? [...requiredParams, ...optionalParams] : undefined;
  };

  const moduleMapToBiDiCommandsInfo = (mm: BidiModuleMap): Record<string, BiDiCommandNamesToInfosMap> => {
    const res: Record<string, BiDiCommandNamesToInfosMap> = {};
    for (const [domain, commands] of Object.entries(mm)) {
      const commandsMap: BiDiCommandNamesToInfosMap = {};
      for (const [name, spec] of Object.entries(commands)) {
        commandsMap[name] = {
          command: spec.command,
          deprecated: spec.deprecated,
          info: spec.info,
          params: toBiDiCommandParams(spec.params),
        };
      }
      res[domain] = commandsMap;
    }
    return res;
  };

  return {
    base: moduleMapToBiDiCommandsInfo(baseModuleMap),
    driver: moduleMapToBiDiCommandsInfo(driverModuleMap),
    plugins: pluginModuleMaps ? mapValues(pluginModuleMaps, moduleMapToBiDiCommandsInfo) : undefined,
  };
}
