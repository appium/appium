import pluralize from 'pluralize';
import {Context} from 'typedoc';
import {isAppiumTypesReflection, isExternalDriverDeclarationReflection} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {BaseConverter} from './base-converter';
import {AppiumTypesReflection, KnownMethods} from './types';
import {findParentReflectionByName, findCommandMethodsInReflection} from './utils';

/**
 * Name of the module containing `ExternalDriver`
 */
export const NAME_TYPES_MODULE = '@appium/types';

/**
 * Name of `ExternalDriver` interface
 */
export const NAME_EXTERNAL_DRIVER = 'ExternalDriver';

/**
 * Converts `@appium/types` into a `KnownMethods`, if it can.
 */
export class BuiltinExternalDriverConverter extends BaseConverter<KnownMethods> {
  /**
   * Creates a child logger for this instance
   * @param ctx Typedoc Context
   * @param log Logger
   */
  constructor(protected ctx: Context, log: AppiumPluginLogger) {
    super(ctx, log.createChildLogger(NAME_TYPES_MODULE));
  }

  #convertMethodDeclarations(refl: AppiumTypesReflection): KnownMethods {
    const externalDriverRefl = refl.getChildByName(NAME_EXTERNAL_DRIVER);
    let methods: KnownMethods = new Map();

    if (!isExternalDriverDeclarationReflection(externalDriverRefl)) {
      this.log.error('Could not find %s', NAME_EXTERNAL_DRIVER);
      return methods;
    }

    methods = findCommandMethodsInReflection(externalDriverRefl);

    if (!methods.size) {
      this.log.error('(%s) No methods found! This is a bug.', NAME_EXTERNAL_DRIVER);
      return methods;
    }

    this.log.verbose(
      '(%s) Done; found %s',
      NAME_EXTERNAL_DRIVER,
      pluralize('builtin command method', methods.size, true)
    );

    return methods;
  }

  public override convert(): KnownMethods {
    const {project} = this.ctx;
    const typesModule = findParentReflectionByName(project, NAME_TYPES_MODULE);
    if (!isAppiumTypesReflection(typesModule)) {
      this.log.error('Could not find %s', NAME_TYPES_MODULE);
      return new Map();
    }

    this.log.verbose('Found %s; converting', NAME_EXTERNAL_DRIVER);

    return this.#convertMethodDeclarations(typesModule);
  }
}
