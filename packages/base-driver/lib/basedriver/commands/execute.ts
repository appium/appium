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
import {closest} from 'fastest-levenshtein';

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
      const closestMatch = closest(script, availableScripts);
      throw new errors.UnsupportedOperationError(
        `Unsupported execute method '${script}', did you mean '${closestMatch}'? ` +
        `Make sure you have the installed ${Driver.name} is up-to-date. ` +
        `Execute methods available in the current driver version are: ` +
        availableScripts.join(', ')
      );
    }
    const args = validateExecuteMethodParams(protoArgs, commandMetadata.params);
    const command = this[commandMetadata.command] as DriverCommand;
    return await command.call(this, ...args);
  },
};

mixin(ExecuteCommands);
