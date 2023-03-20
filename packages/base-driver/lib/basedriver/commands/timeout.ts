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
    if (util.hasValue(type) && util.hasValue(ms)) {
      this.log.debug(`MJSONWP timeout arguments: ${JSON.stringify({type, ms})}}`);

      switch (type) {
        case 'command':
          await this.newCommandTimeout(ms);
          return;
        case 'implicit':
          await this.implicitWaitMJSONWP(ms);
          return;
        case 'page load':
          await this.pageLoadTimeoutMJSONWP(ms);
          return;
        case 'script':
          await this.scriptTimeoutMJSONWP(ms);
          return;
        default:
          throw new Error(`'${type}' type is not supported for MJSONWP timeout`);
      }
    }

    // Otherwise assume it is W3C protocol
    this.log.debug(
      `W3C timeout argument: ${JSON.stringify({
        script,
        pageLoad,
        implicit,
      })}}`
    );
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
  async implicitWaitW3C<C extends Constraints>(this: BaseDriver<C>, ms) {
    await this.implicitWait(ms);
  },

  async implicitWaitMJSONWP<C extends Constraints>(this: BaseDriver<C>, ms) {
    await this.implicitWait(ms);
  },

  async implicitWait<C extends Constraints>(this: BaseDriver<C>, ms) {
    this.setImplicitWait(this.parseTimeoutArgument(ms));
  },

  // pageLoad
  async pageLoadTimeoutW3C<C extends Constraints>(this: BaseDriver<C>, ms) {
    throw new errors.NotImplementedError('Not implemented yet for pageLoad.');
  },

  async pageLoadTimeoutMJSONWP<C extends Constraints>(this: BaseDriver<C>, ms) {
    throw new errors.NotImplementedError('Not implemented yet for pageLoad.');
  },

  // script
  async scriptTimeoutW3C<C extends Constraints>(this: BaseDriver<C>, ms) {
    throw new errors.NotImplementedError('Not implemented yet for script.');
  },

  async scriptTimeoutMJSONWP<C extends Constraints>(this: BaseDriver<C>, ms) {
    throw new errors.NotImplementedError('Not implemented yet for script.');
  },

  // command
  async newCommandTimeout<C extends Constraints>(this: BaseDriver<C>, ms) {
    this.setNewCommandTimeout(this.parseTimeoutArgument(ms));
  },

  setImplicitWait<C extends Constraints>(this: BaseDriver<C>, ms: number) {
    // eslint-disable-line require-await
    this.implicitWaitMs = ms;
    this.log.debug(`Set implicit wait to ${ms}ms`);
    if (this.managedDrivers && this.managedDrivers.length) {
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
    if (this.managedDrivers && this.managedDrivers.length) {
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
