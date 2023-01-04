import pluralize from 'pluralize';
import {Context} from 'typedoc';
import {isAppiumTypesReflection, isExternalDriverDeclarationReflection} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {BaseConverter} from './base-converter';
import {AppiumTypesReflection, KnownMethods} from './types';
import {findAsyncMethodsInReflection, findParentReflectionByName} from './utils';

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
    super(ctx, log.createChildLogger('interfaces'));
  }

  #convertMethodDeclarations(refl: AppiumTypesReflection): KnownMethods {
    const externalDriver = refl.getChildByName(NAME_EXTERNAL_DRIVER);
    let methods: KnownMethods = new Map();

    if (!isExternalDriverDeclarationReflection(externalDriver)) {
      this.log.warn('Could not find %s in %s', NAME_EXTERNAL_DRIVER, NAME_TYPES_MODULE);
      return methods;
    }

    methods = findAsyncMethodsInReflection(externalDriver);

    if (!methods.size) {
      this.log.warn('No methods found in %s', NAME_EXTERNAL_DRIVER);
      return methods;
    }

    this.log.verbose(
      'Found %s in %s',
      pluralize('method declaration', methods.size, true),
      NAME_EXTERNAL_DRIVER
    );

    return methods;
  }

  public override convert(): KnownMethods {
    const {project} = this.ctx;
    let methods: KnownMethods = new Map();
    const typesModule = findParentReflectionByName(project, NAME_TYPES_MODULE);
    if (!isAppiumTypesReflection(typesModule)) {
      this.log.error('Could not find %s', NAME_TYPES_MODULE);
      return methods;
    }

    this.log.verbose(
      'Found %s; gathering methods from %s',
      NAME_TYPES_MODULE,
      NAME_EXTERNAL_DRIVER
    );

    return this.#convertMethodDeclarations(typesModule);
  }
}
