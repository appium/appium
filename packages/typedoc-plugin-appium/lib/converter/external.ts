import _ from 'lodash';
import pluralize from 'pluralize';
import {Context, ReflectionKind} from 'typedoc';
import {
  isClassDeclarationReflection,
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
import {convertOverrides} from './overrides';
import {convertExecuteMethodMap} from './exec-method-map';
import {convertMethodMap} from './method-map';
import {ClassDeclarationReflection, KnownMethods} from './types';
import {
  filterChildrenByGuard,
  findChildByGuard,
  findChildByNameAndGuard,
  findAsyncMethodsInReflection,
} from './utils';

/**
 * Name of the static `newMethodMap` property in a Driver
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
    protected readonly knownMethods: KnownMethods,
    protected readonly builtinCommands?: ModuleCommands
  ) {
    super(ctx, log, builtinCommands);
    this.log.verbose('Known method count: %d', knownMethods.size);
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
        this.log.verbose('Converting module %s', mod.name);
        const cmdInfo = this.#convertModuleClasses(mod);
        projectCommands.set(mod.name, cmdInfo);
      }
    } else {
      const cmdInfo = this.#convertModuleClasses(project);
      projectCommands.set(project.name, cmdInfo);
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
   * @param parentRefl - Project or module
   * @returns Info about the commands in given `parent`
   */
  #convertModuleClasses(parentRefl: ParentReflection) {
    let routeMap: RouteMap = new Map();
    let execMethodData: ExecMethodDataSet = new Set();

    const classReflections = filterChildrenByGuard(parentRefl, isClassDeclarationReflection);

    for (const classRefl of classReflections) {
      const methods = findAsyncMethodsInReflection(classRefl, this.knownMethods);

      if (!methods.size) {
        this.log.warn('(%s) No async methods found', classRefl.name);
        continue;
      }

      this.log.verbose(
        '(%s) Converting %s',
        classRefl.name,
        pluralize('potential method', methods.size, true)
      );

      const newRouteMap = this.#findAndConvertNewMethodMap(classRefl, methods);
      routeMap = new Map([...routeMap, ...newRouteMap]);

      const newExecMethodData = this.#findAndConvertExecMethodMap(classRefl, methods);
      execMethodData = new Set([...execMethodData, ...newExecMethodData]);

      const overriddenRouteMap: RouteMap = this.builtinCommands
        ? convertOverrides({
            log: this.log,
            parentRefl: classRefl,
            classMethods: methods,
            builtinMethods: this.knownMethods,
            newRouteMap,
            newExecMethodMap: execMethodData,
            builtinCommands: this.builtinCommands,
          })
        : new Map();

      routeMap = new Map([...routeMap, ...overriddenRouteMap]);

      this.log.verbose(
        '(%s) Done; found %s and %s',
        classRefl.name,
        pluralize('route', newRouteMap.size + overriddenRouteMap.size, true),
        pluralize('execute method', newExecMethodData.size, true)
      );
    }

    return new ModuleCommands(routeMap, execMethodData);
  }

  /**
   * If the class has an `executeMethodMap`, convert it
   * @param classRefl A class
   * @param methods Methods in said class
   * @returns A set of exec method data which may be empty
   */
  #findAndConvertExecMethodMap(
    classRefl: ClassDeclarationReflection,
    methods: KnownMethods
  ): ExecMethodDataSet {
    const execMethodMapRefl = findChildByGuard(classRefl, isExecMethodDefReflection);
    if (!execMethodMapRefl) {
      return new Set();
    }
    return convertExecuteMethodMap({
      log: this.log,
      parentRefl: classRefl,
      execMethodMapRefl,
      methods,
      strict: true,
    });
  }

  /**
   * If the class has a `newMethodMap`, convert it
   * @param classRefl A class
   * @param methods Methods in said class
   * @returns A map of routes which may be empty
   */
  #findAndConvertNewMethodMap(
    classRefl: ClassDeclarationReflection,
    methods: KnownMethods
  ): RouteMap {
    const newMethodMapRefl = findChildByNameAndGuard(
      classRefl,
      NAME_NEW_METHOD_MAP,
      isMethodMapDeclarationReflection
    );
    if (!newMethodMapRefl) {
      this.log.verbose('No new method map in %s', classRefl.name);
      return new Map();
    }
    return convertMethodMap({
      log: this.log,
      methodMapRef: newMethodMapRefl,
      parentRefl: classRefl,
      methods,
      knownMethods: this.knownMethods,
      strict: true,
    });
  }
}
