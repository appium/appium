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
      throw new errors.UnsupportedOperationError(
        `Unsupported execute method '${script}'. Available methods ` +
          `are: ${availableScripts.join(', ')}`
      );
    }
    const args = validateExecuteMethodParams(protoArgs, commandMetadata.params);
    const command = this[commandMetadata.command] as DriverCommand;
    return await command.call(this, ...args);
  },
};

mixin(ExecuteCommands);
