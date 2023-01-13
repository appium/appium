import {Context} from 'typedoc';
import {
  isBaseDriverDeclarationReflection,
  isClassDeclarationReflection,
  isMethodMapDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {BaseConverter} from './base-converter';
import {BuiltinCommands} from '../model/builtin-commands';
import {convertMethodMap} from './method-map';
import {KnownMethods} from './types';
import {
  findChildByNameAndGuard,
  findAsyncMethodsInReflection,
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
    protected readonly knownMethods: KnownMethods
  ) {
    super(ctx, log.createChildLogger('builtins'));
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

    this.log.verbose('Found %s', NAME_BUILTIN_COMMAND_MODULE);

    // we need base driver class to find methods implemented in it
    const baseDriverClassRefl = findChildByNameAndGuard(
      baseDriverModuleRefl,
      NAME_BASE_DRIVER_CLASS,
      isClassDeclarationReflection
    );
    if (!baseDriverClassRefl) {
      this.log.error(
        'Could not find %s in %s',
        NAME_BASE_DRIVER_CLASS,
        NAME_BUILTIN_COMMAND_MODULE
      );
      return new BuiltinCommands();
    }

    const methodMap = baseDriverModuleRefl.getChildByName(NAME_METHOD_MAP);

    if (!isMethodMapDeclarationReflection(methodMap)) {
      this.log.error('Could not find %s in %s', NAME_METHOD_MAP, NAME_BUILTIN_COMMAND_MODULE);
      return new BuiltinCommands();
    }

    const baseDriverRoutes = convertMethodMap({
      log: this.log,
      methodMapRef: methodMap,
      parentRefl: baseDriverModuleRefl,
      methods: findAsyncMethodsInReflection(baseDriverClassRefl, this.knownMethods),
    });

    if (!baseDriverRoutes.size) {
      this.log.error('Could not find any commands in %s', NAME_BUILTIN_COMMAND_MODULE);
      return new BuiltinCommands();
    }

    return new BuiltinCommands(baseDriverRoutes, baseDriverModuleRefl);
  }
}
