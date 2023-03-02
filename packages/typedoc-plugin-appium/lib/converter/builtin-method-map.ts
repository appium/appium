import {Context} from 'typedoc';
import {
  isBaseDriverDeclarationReflection,
  isClassDeclarationReflection,
  isMethodMapDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {BuiltinCommands} from '../model/builtin-commands';
import {BaseConverter} from './base-converter';
import {convertMethodMap} from './method-map';
import {KnownMethods} from './types';
import {
  findChildByNameAndGuard,
  findCommandMethodsInReflection,
  findParentReflectionByName,
} from './utils';

/**
 * Name of the builtin method map in `@appium/base-driver`
 */
export const NAME_METHOD_MAP = 'METHOD_MAP';

export const NAME_BASE_DRIVER_CLASS = 'BaseDriver';

/**
 * Name of the module which contains the builtin method map
 */
export const NAME_BUILTIN_COMMAND_MODULE = '@appium/base-driver';

export class BuiltinMethodMapConverter extends BaseConverter<BuiltinCommands> {
  /**
   * Creates a child logger for this instance
   * @param ctx Typedoc Context
   * @param log Logger
   */
  constructor(
    ctx: Context,
    log: AppiumPluginLogger,
    protected readonly knownBuiltinMethods: KnownMethods
  ) {
    super(ctx, log.createChildLogger(NAME_BUILTIN_COMMAND_MODULE));
  }

  /**
   * Converts `@appium/base-driver` into a `RouteMap`, if it can.
   *
   * @returns Object containing a declaration reflection of `@appium/base-driver` and its associated
   * route map (if found).
   */
  public override convert(): BuiltinCommands {
    const {project} = this.ctx;
    const baseDriverModuleRefl = findParentReflectionByName(project, NAME_BUILTIN_COMMAND_MODULE);

    if (!isBaseDriverDeclarationReflection(baseDriverModuleRefl)) {
      this.log.error('Could not find %s', NAME_BUILTIN_COMMAND_MODULE);
      return new BuiltinCommands();
    }

    this.log.verbose('Converting builtin method map');

    // we need base driver class to find methods implemented in it
    const baseDriverClassRefl = findChildByNameAndGuard(
      baseDriverModuleRefl,
      NAME_BASE_DRIVER_CLASS,
      isClassDeclarationReflection
    );
    if (!baseDriverClassRefl) {
      this.log.error('Could not find module %s', NAME_BUILTIN_COMMAND_MODULE);
      return new BuiltinCommands();
    }

    const methodMap = baseDriverModuleRefl.getChildByName(NAME_METHOD_MAP);

    if (!isMethodMapDeclarationReflection(methodMap)) {
      this.log.error('Could not find %s in %s', NAME_METHOD_MAP, NAME_BUILTIN_COMMAND_MODULE);
      return new BuiltinCommands();
    }

    const knownClassMethods = findCommandMethodsInReflection(baseDriverClassRefl);
    const baseDriverRoutes = convertMethodMap({
      ctx: this.ctx,
      log: this.log,
      methodMapRefl: methodMap,
      parentRefl: baseDriverModuleRefl,
      knownClassMethods,
      knownBuiltinMethods: this.knownBuiltinMethods,
    });

    if (!baseDriverRoutes.size) {
      this.log.error('Could not find any commands in %s', NAME_BUILTIN_COMMAND_MODULE);
      return new BuiltinCommands();
    }

    return new BuiltinCommands(baseDriverRoutes, baseDriverModuleRefl);
  }
}
