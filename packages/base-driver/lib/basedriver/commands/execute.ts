import _ from 'lodash';
import {errors, validateExecuteMethodParams} from '../../protocol';
import {
  Constraints,
  Driver,
  DriverClass,
  DriverCommand,
  IExecuteCommands,
  StringRecord,
} from '@appium/types';
import {mixin} from './mixin';
import {BaseDriver} from '../driver';
import {distance} from 'fastest-levenshtein';

declare module '../driver' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends IExecuteCommands {}
}

const ExecuteCommands: IExecuteCommands = {
  async executeMethod<C extends Constraints>(
    this: BaseDriver<C>,
    script: string,
    protoArgs: readonly [StringRecord<unknown>] | readonly unknown[]
  ) {
    const Driver = this.constructor as DriverClass<Driver<C>>;
    const commandMetadata = {...Driver.executeMethodMap?.[script]};
    if (!commandMetadata.command) {
      const availableScripts = _.keys(Driver.executeMethodMap);
      if (_.isEmpty(availableScripts)) {
        throw new errors.UnsupportedOperationError(
          `Unsupported execute method '${script}'. ` +
          `Make sure the installed ${Driver.name} is up-to-date. ` +
          `The current driver version does not define any execute methods.`
        );
      }
      const matchesMap: StringRecord<string[]> = availableScripts
        .map((name) => [distance(script, name), name])
        .reduce((acc, [key, value]) => {
          if (key in acc) {
            acc[key].push(value);
          } else {
            acc[key] = [value];
          }
          return acc;
        }, {});
      const sortedMatches = _.flatten(
        _.keys(matchesMap)
          .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
          .map((x) => matchesMap[x])
      );
      throw new errors.UnsupportedOperationError(
        `Unsupported execute method '${script}', did you mean '${sortedMatches[0]}'? ` +
        `Make sure the installed ${Driver.name} is up-to-date. ` +
        `Execute methods available in the current driver version are: ` +
        sortedMatches.join(', ')
      );
    }
    const args = validateExecuteMethodParams(protoArgs, commandMetadata.params);
    const command = this[commandMetadata.command] as DriverCommand;
    return await command.call(this, ...args);
  },
};

mixin(ExecuteCommands);
