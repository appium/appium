import {waitForCondition} from 'asyncbox';
import _ from 'lodash';
import {util} from '@appium/support';
import {errors} from '../../protocol';
import {BaseDriver} from '../driver';
import {Constraints, ITimeoutCommands} from '@appium/types';
import {mixin} from './mixin';

declare module '../driver' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends ITimeoutCommands {}
}

const MIN_TIMEOUT = 0;

const TimeoutCommands: ITimeoutCommands = {
  async timeouts<C extends Constraints>(this: BaseDriver<C>, type, ms, script, pageLoad, implicit) {
    if (type && _.isString(type) && util.hasValue(ms)) {
      // legacy stuff with some Appium-specific additions
      this.log.debug(`Timeout arguments: ${JSON.stringify({type, ms})}}`);
      switch (type) {
        case 'command':
          return void (await this.newCommandTimeout(ms));
        case 'implicit':
          return void (await this.implicitWaitW3C(ms));
        case 'page load':
          return void (await this.pageLoadTimeoutW3C(ms));
        case 'script':
          return void (await this.scriptTimeoutW3C(ms));
        default:
          throw new Error(`'${type}' type is not supported for the timeout API`);
      }
    }

    this.log.debug(`W3C timeout argument: ${JSON.stringify({script, pageLoad, implicit})}}`);
    if ([script, pageLoad, implicit].every(_.isNil)) {
      throw new errors.InvalidArgumentError('W3C protocol expects any of script, pageLoad or implicit to be set');
    }
    if (util.hasValue(script)) {
      await this.scriptTimeoutW3C(script);
    }
    if (util.hasValue(pageLoad)) {
      await this.pageLoadTimeoutW3C(pageLoad);
    }
    if (util.hasValue(implicit)) {
      await this.implicitWaitW3C(implicit);
    }
  },

  async getTimeouts() {
    return {
      command: this.newCommandTimeoutMs,
      implicit: this.implicitWaitMs,
    };
  },

  // implicit
  async implicitWaitW3C<C extends Constraints>(this: BaseDriver<C>, ms: number) {
    this.setImplicitWait(this.parseTimeoutArgument(ms));
  },

  // pageLoad
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async pageLoadTimeoutW3C<C extends Constraints>(this: BaseDriver<C>, ms: number) {
    throw new errors.NotImplementedError('Not implemented yet for pageLoad.');
  },

  // script
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async scriptTimeoutW3C<C extends Constraints>(this: BaseDriver<C>, ms: number) {
    throw new errors.NotImplementedError('Not implemented yet for script.');
  },

  // command
  async newCommandTimeout<C extends Constraints>(this: BaseDriver<C>, ms: number) {
    this.setNewCommandTimeout(this.parseTimeoutArgument(ms));
  },

  setImplicitWait<C extends Constraints>(this: BaseDriver<C>, ms: number) {
    this.implicitWaitMs = ms;
    this.log.debug(`Set implicit wait to ${ms}ms`);
    if (this.managedDrivers?.length) {
      this.log.debug('Setting implicit wait on managed drivers');
      for (const driver of this.managedDrivers) {
        if (_.isFunction(driver.setImplicitWait)) {
          driver.setImplicitWait(ms);
        }
      }
    }
  },

  setNewCommandTimeout<C extends Constraints>(this: BaseDriver<C>, ms: number) {
    this.newCommandTimeoutMs = ms;
    this.log.debug(`Set new command timeout to ${ms}ms`);
    if (this.managedDrivers?.length) {
      this.log.debug('Setting new command timeout on managed drivers');
      for (const driver of this.managedDrivers) {
        if (_.isFunction(driver.setNewCommandTimeout)) {
          driver.setNewCommandTimeout(ms);
        }
      }
    }
  },

  async implicitWaitForCondition<C extends Constraints>(
    this: BaseDriver<C>,
    condFn: (...args: any[]) => Promise<any>
  ) {
    this.log.debug(`Waiting up to ${this.implicitWaitMs} ms for condition`);
    const wrappedCondFn = async (...args: any[]) => {
      // reset command timeout
      await this.clearNewCommandTimeout();

      return await condFn(...args);
    };
    return await waitForCondition(wrappedCondFn, {
      waitMs: this.implicitWaitMs,
      intervalMs: 500,
      logger: this.log,
    });
  },

  parseTimeoutArgument<C extends Constraints>(this: BaseDriver<C>, ms: number | string) {
    const duration = parseInt(String(ms), 10);
    if (_.isNaN(duration) || duration < MIN_TIMEOUT) {
      throw new errors.UnknownError(`Invalid timeout value '${ms}'`);
    }
    return duration;
  },
};

mixin(TimeoutCommands);
