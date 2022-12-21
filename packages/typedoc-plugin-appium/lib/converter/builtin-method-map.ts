import {Context} from 'typedoc';
import {
  isBaseDriverDeclarationReflection,
  isClassDeclarationReflection,
  isMethodMapDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {ModuleCommands} from '../model';
import {BaseConverter} from './base-converter';
import {convertMethodMap} from './method-map';
import {BuiltinCommandSource, KnownMethods} from './types';
import {
  findChildByNameAndGuard,
  findMethodsInClassReflection,
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

export class BuiltinMethodMapConverter extends BaseConverter<BuiltinCommandSource | undefined> {
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

  public override convert(): BuiltinCommandSource {
    const {project} = this.ctx;
    let methods: KnownMethods = new Map();
    let builtinCmdSrc = {} as BuiltinCommandSource;
    const baseDriverRef = findParentReflectionByName(project, NAME_BUILTIN_COMMAND_MODULE);

    if (!isBaseDriverDeclarationReflection(baseDriverRef)) {
      this.log.verbose('Did not find %s', NAME_BUILTIN_COMMAND_MODULE);
      return builtinCmdSrc;
    }

    this.log.verbose('Found %s', NAME_BUILTIN_COMMAND_MODULE);

    // we need base driver class to find methods implemented in it
    const baseDriverClassRef = findChildByNameAndGuard(
      baseDriverRef,
      NAME_BASE_DRIVER_CLASS,
      isClassDeclarationReflection
    );
    if (!baseDriverClassRef) {
      this.log.error(
        'Could not find %s in %s',
        NAME_BASE_DRIVER_CLASS,
        NAME_BUILTIN_COMMAND_MODULE
      );
    } else {
      methods = findMethodsInClassReflection(baseDriverClassRef, this.knownMethods);
    }

    const methodMap = baseDriverRef.getChildByName(NAME_METHOD_MAP);

    if (!isMethodMapDeclarationReflection(methodMap)) {
      this.log.error('Could not find %s in %s', NAME_METHOD_MAP, NAME_BUILTIN_COMMAND_MODULE);
      return builtinCmdSrc;
    }

    const baseDriverRoutes = convertMethodMap({
      log: this.log,
      methodMapRef: methodMap,
      parentRefl: baseDriverRef,
      methods,
    });

    if (!baseDriverRoutes.size) {
      this.log.error('Could not find any commands in %s!?', NAME_BUILTIN_COMMAND_MODULE);
      return builtinCmdSrc;
    }

    builtinCmdSrc = {refl: baseDriverRef, moduleCmds: new ModuleCommands(baseDriverRoutes)};
    return builtinCmdSrc;
  }
}
