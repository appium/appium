import _ from 'lodash';
import pluralize from 'pluralize';
import {Context, ReflectionKind} from 'typedoc';
import {
  isBasePluginConstructorDeclarationReflection,
  isClassDeclarationReflection,
  isConstructorDeclarationReflection,
  isExecMethodDefReflection,
  isMethodMapDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {
  ExecMethodDataSet,
  ModuleCommands,
  ParentReflection,
  ProjectCommands,
  RouteMap,
} from '../model';
import {BaseConverter} from './base-converter';
import {convertExecuteMethodMap} from './exec-method-map';
import {convertMethodMap} from './method-map';
import {convertOverrides} from './overrides';
import {ClassDeclarationReflection, KnownMethods} from './types';
import {
  filterChildrenByGuard,
  findChildByGuard,
  findChildByNameAndGuard,
  findCommandMethodsInReflection,
} from './utils';

/**
 * Name of the static `newMethodMap` property in a Driver or Plugin
 */
export const NAME_NEW_METHOD_MAP = 'newMethodMap';

/**
 * Name of the static `executeMethodMap` property in a Driver
 */
export const NAME_EXECUTE_METHOD_MAP = 'executeMethodMap';

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

export const NAME_BASE_PLUGIN = 'BasePlugin';

/**
 * Converts declarations to information about Appium commands
 */
export class ExternalConverter extends BaseConverter<ProjectCommands> {
  /**
   * Creates a child logger for this instance
   * @param ctx Typedoc Context
   * @param log Logger
   */
  constructor(
    ctx: Context,
    log: AppiumPluginLogger,
    protected readonly builtinMethods: KnownMethods,
    protected readonly builtinCommands?: ModuleCommands
  ) {
    super(ctx, log.createChildLogger('extension'), builtinCommands);
  }

  /**
   * Converts declarations into command information
   *
   * @returns Command info for entire project
   */
  public override convert(): ProjectCommands {
    const ctx = this.ctx;
    const {project} = ctx;
    const projectCommands: ProjectCommands = new ProjectCommands();

    // convert all modules (or just project if no modules)
    const modules = project.getChildrenByKind(ReflectionKind.Module);
    if (modules.length) {
      for (const mod of modules) {
        const log = this.log.createChildLogger(mod.name);
        log.verbose('(%s) Begin conversion', mod.name);
        const cmdInfo = this.#convertModuleClasses(mod, log);
        projectCommands.set(mod.name, cmdInfo);
        log.verbose('(%s) End conversion', mod.name);
      }
    } else {
      const log = this.log.createChildLogger(project.name);
      log.verbose('(%s) Begin conversion', project.name);
      const cmdInfo = this.#convertModuleClasses(project, log);
      projectCommands.set(project.name, cmdInfo);
      log.verbose('(%s) End conversion', project.name);
    }

    if (projectCommands.size) {
      const routeSum = _.sumBy([...projectCommands], ([, info]) => info.routeMap.size);
      const execMethodSum = _.sumBy(
        [...projectCommands],
        ([, info]) => info.execMethodDataSet.size
      );
      this.log.info(
        'Found %s and %s in %s',
        pluralize('command', routeSum, true),
        pluralize('execute method', execMethodSum, true),
        pluralize('module', modules.length, true)
      );
    } else {
      this.log.error('No commands nor execute methods found in entire project!');
    }

    return projectCommands;
  }

  /**
   * Finds commands in all classes within a project or module
   *
   * Strategy:
   *
   * 1. Given a module or project, find all classes
   * 2. For each class, find all async methods, which _can_ be commands
   * 3. Parse the `newMethodMap` of each class, if any
   * 4. For each method, look for it in either `newMethodMap` or the known methods
   * 5. Handle execute methods
   *
   * @param parentRefl - Project or module
   * @returns Info about the commands in given `parent`
   */
  #convertModuleClasses(parentRefl: ParentReflection, log: AppiumPluginLogger): ModuleCommands {
    let routeMap: RouteMap = new Map();
    let execMethodData: ExecMethodDataSet = new Set();

    const classReflections = filterChildrenByGuard(parentRefl, isClassDeclarationReflection);

    for (const classRefl of classReflections) {
      const isPlugin = isBasePluginConstructorDeclarationReflection(
        findChildByGuard(classRefl, isConstructorDeclarationReflection)
      );

      const classMethods: KnownMethods = findCommandMethodsInReflection(classRefl);

      if (!classMethods.size) {
        // may or may not be expected
        log.verbose('(%s) No command methods found', classRefl.name);
        continue;
      }

      log.verbose(
        '(%s) Analyzing %s',
        classRefl.name,
        pluralize('method', classMethods.size, true)
      );

      const newRouteMap = this.#findAndConvertNewMethodMap(classRefl, classMethods, log, isPlugin);
      routeMap = new Map([...routeMap, ...newRouteMap]);

      const newExecMethodData = this.#findAndConvertExecMethodMap(
        classRefl,
        classMethods,
        log,
        isPlugin
      );
      execMethodData = new Set([...execMethodData, ...newExecMethodData]);

      const overriddenRouteMap: RouteMap = this.builtinCommands
        ? convertOverrides({
            ctx: this.ctx,
            log,
            parentRefl: classRefl,
            classMethods,
            builtinMethods: this.builtinMethods,
            newRouteMap,
            newExecMethodMap: execMethodData,
            builtinCommands: this.builtinCommands,
          })
        : new Map();

      routeMap = new Map([...routeMap, ...overriddenRouteMap]);

      log.verbose(
        '(%s) Done; found %s and %s',
        classRefl.name,
        pluralize('total command', newRouteMap.size + overriddenRouteMap.size, true),
        pluralize('total execute method', newExecMethodData.size, true)
      );
    }

    return new ModuleCommands(routeMap, execMethodData);
  }

  /**
   * If the class has an `executeMethodMap`, convert it
   * @param parentRefl A class
   * @param methods Methods in said class
   * @param isPluginCommand If `parentRefl` represents an Appium Plugin or not
   * @param log Logger specific to `parentRefl`
   * @returns A set of exec method data which may be empty
   */
  #findAndConvertExecMethodMap(
    parentRefl: ClassDeclarationReflection,
    methods: KnownMethods,
    log: AppiumPluginLogger,
    isPluginCommand?: boolean
  ): ExecMethodDataSet {
    const execMethodMapRefl = findChildByGuard(parentRefl, isExecMethodDefReflection);
    if (!execMethodMapRefl) {
      log.verbose('(%s) No execute method map found', parentRefl.name);
      return new Set();
    }
    return convertExecuteMethodMap({
      ctx: this.ctx,
      log,
      parentRefl,
      execMethodMapRefl,
      knownMethods: methods,
      strict: true,
      isPluginCommand,
    });
  }

  /**
   * If the class has a `newMethodMap`, convert it
   * @param parentRefl A class
   * @param methods Methods in said class
   * @param log Logger specific to `parentRefl`
   * @param isPluginCommand If `parentRefl` represents an Appium Plugin or not
   * @returns A map of routes which may be empty
   */
  #findAndConvertNewMethodMap(
    parentRefl: ClassDeclarationReflection,
    methods: KnownMethods,
    log: AppiumPluginLogger,
    isPluginCommand?: boolean
  ): RouteMap {
    const newMethodMapRefl = findChildByNameAndGuard(
      parentRefl,
      NAME_NEW_METHOD_MAP,
      isMethodMapDeclarationReflection
    );
    if (!newMethodMapRefl) {
      log.verbose('(%s) No new method map found', parentRefl.name);
      return new Map();
    }
    return convertMethodMap({
      ctx: this.ctx,
      log,
      methodMapRefl: newMethodMapRefl,
      parentRefl,
      knownClassMethods: methods,
      knownBuiltinMethods: this.builtinMethods,
      strict: true,
      isPluginCommand,
    });
  }
}
