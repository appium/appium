import _ from 'lodash';
import {Context, DeclarationReflection, ReflectionKind} from 'typedoc';
import {
  isCommandPropDeclarationReflection,
  isExecMethodDefParamsPropDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {ExecMethodData, ExecMethodDataSet, NAME_EXECUTE_ROUTE} from '../model';
import {deriveComment} from './comment';
import {ExecMethodDeclarationReflection, KnownMethods} from './types';
import {
  convertOptionalCommandParams,
  convertRequiredCommandParams,
  filterChildrenByKind,
  findChildByGuard,
} from './utils';

/**
 * Options for {@linkcode convertExecuteMethodMap}
 */
export interface ConvertExecuteMethodMapOpts {
  ctx: Context;
  /**
   * Logger
   */
  log: AppiumPluginLogger;
  /**
   * Probably a class
   */
  parentRefl: DeclarationReflection;
  /**
   * The static `executeMethodMap` property of the class
   */
  execMethodMapRefl: ExecMethodDeclarationReflection;
  /**
   * Builtin methods from `@appium/types`
   */
  knownMethods: KnownMethods;
  /**
   * If `true`, do not add a route if the method it references cannot be found
   */
  strict?: boolean;
  /**
   * If `true`, handle commands as `PluginCommand`s, which affects which parameters get used
   */
  isPluginCommand?: boolean;
}

/**
 * Gathers info about an `executeMethodMap` prop in a driver
 * @param opts Options (mostly non-optional)
 * @returns List of "execute commands", if any
 */
export function convertExecuteMethodMap({
  ctx,
  log,
  parentRefl,
  execMethodMapRefl,
  knownMethods,
  strict = false,
  isPluginCommand = false,
}: ConvertExecuteMethodMapOpts): ExecMethodDataSet {
  const commandRefs: ExecMethodDataSet = new Set();
  if (!execMethodMapRefl) {
    // no execute commands in this class
    return commandRefs;
  }

  const newMethodProps = filterChildrenByKind(execMethodMapRefl, ReflectionKind.Property);
  for (const newMethodProp of newMethodProps) {
    const {comment, originalName: script} = newMethodProp;

    const commandProp = findChildByGuard(newMethodProp, isCommandPropDeclarationReflection);

    if (!commandProp) {
      // this is a bug in the driver implementation
      log.warn(
        'Execute method map in %s has no "command" property for %s',
        parentRefl.name,
        script
      );
      continue;
    }

    if (!_.isString(commandProp.type.value) || _.isEmpty(commandProp.type.value)) {
      // this is a bug in the driver implementation
      log.warn(
        'Execute method map in %s has an empty or invalid "command" property for %s',
        parentRefl.name,
        script
      );
      continue;
    }
    const command = String(commandProp.type.value);

    const paramsProp = findChildByGuard(
      newMethodProp,
      isExecMethodDefParamsPropDeclarationReflection
    );
    const requiredParams = convertRequiredCommandParams(paramsProp);
    const optionalParams = convertOptionalCommandParams(paramsProp);

    const methodRefl = knownMethods.get(command);

    if (!methodRefl) {
      if (strict) {
        log.error('No method found for command "%s" from script "%s"', command, script);
      }
      continue;
    }

    const commentData = deriveComment({refl: methodRefl, comment, knownMethods});

    const execMethodData = ExecMethodData.create(ctx, log, command, methodRefl, script, {
      requiredParams,
      optionalParams,
      comment: commentData?.comment,
      commentSource: commentData?.commentSource,
      isPluginCommand,
    });

    commandRefs.add(execMethodData);
    log.verbose(
      'Added POST route %s for command "%s" from script "%s"',
      NAME_EXECUTE_ROUTE,
      command,
      script
    );
  }
  return commandRefs;
}
