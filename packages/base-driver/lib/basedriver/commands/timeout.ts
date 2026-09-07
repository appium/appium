import {util} from '@appium/support';
import type {Constraints, ITimeoutCommands} from '@appium/types';
import {waitForCondition} from 'asyncbox';

import {errors} from '../../protocol/index.js';
import type {BaseDriver} from '../driver.js';

declare module '../driver.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends ITimeoutCommands {}
}

const MIN_TIMEOUT = 0;

/**
 * Set the various timeouts associated with a session
 * @see {@link https://w3c.github.io/webdriver/#set-timeouts}
 *
 * @param type - used only for the old (JSONWP) command, the type of the timeout
 * @param ms - used only for the old (JSONWP) command, the ms for the timeout
 * @param script - the number in ms for the script timeout, used for the W3C command
 * @param pageLoad - the number in ms for the pageLoad timeout, used for the W3C command
 * @param implicit - the number in ms for the implicit wait timeout, used for the W3C command
 */
export async function timeouts<C extends Constraints>(
  this: BaseDriver<C>,
  type?: string,
  ms?: number | string,
  script?: number,
  pageLoad?: number,
  implicit?: number,
): Promise<void> {
  if (type && typeof type === 'string' && util.hasValue(ms)) {
    // legacy stuff with some Appium-specific additions
    this.log.debug(`Timeout arguments: ${JSON.stringify({type, ms})}`);
    switch (type) {
      case 'command':
        return void (await this.newCommandTimeout(this.parseTimeoutArgument(ms)));
      case 'implicit':
        return void (await this.implicitWaitW3C(this.parseTimeoutArgument(ms)));
      case 'page load':
        return void (await this.pageLoadTimeoutW3C(this.parseTimeoutArgument(ms)));
      case 'script':
        return void (await this.scriptTimeoutW3C(this.parseTimeoutArgument(ms)));
      default:
        throw new Error(`'${type}' type is not supported for the timeout API`);
    }
  }

  this.log.debug(`W3C timeout argument: ${JSON.stringify({script, pageLoad, implicit})}`);
  if ([script, pageLoad, implicit].every((value) => value == null)) {
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
}

/**
 * Get the current timeouts
 * @see {@link https://w3c.github.io/webdriver/#get-timeouts}
 *
 * @returns A map of timeout names to ms values
 */
export async function getTimeouts<C extends Constraints>(this: BaseDriver<C>) {
  return {
    command: this.newCommandTimeoutMs,
    implicit: this.implicitWaitMs,
  };
}

/**
 * Set the implicit wait value that was sent in via the W3C protocol
 *
 * @param ms - the timeout in ms
 */
export async function implicitWaitW3C<C extends Constraints>(this: BaseDriver<C>, ms: number): Promise<void> {
  this.setImplicitWait(this.parseTimeoutArgument(ms));
}

/**
 * Set the page load timeout value that was sent in via the W3C protocol
 *
 * @param ms - the timeout in ms
 */
export async function pageLoadTimeoutW3C<C extends Constraints>(this: BaseDriver<C>, ms: number): Promise<void> {
  void ms;
  throw new errors.NotImplementedError('Not implemented yet for pageLoad.');
}

/**
 * Set the script timeout value that was sent in via the W3C protocol
 *
 * @param ms - the timeout in ms
 */
export async function scriptTimeoutW3C<C extends Constraints>(this: BaseDriver<C>, ms: number): Promise<void> {
  void ms;
  throw new errors.NotImplementedError('Not implemented yet for script.');
}

/**
 * Set Appium's new command timeout
 *
 * @param ms - the timeout in ms
 */
export async function newCommandTimeout<C extends Constraints>(this: BaseDriver<C>, ms: number): Promise<void> {
  this.setNewCommandTimeout(this.parseTimeoutArgument(ms));
}

/**
 * A helper method (not a command) used to set the implicit wait value
 *
 * @param ms - the implicit wait in ms
 */
export function setImplicitWait<C extends Constraints>(this: BaseDriver<C>, ms: number): void {
  this.implicitWaitMs = ms;
  this.log.debug(`Set implicit wait to ${ms}ms`);
  if (this.managedDrivers?.length) {
    this.log.debug('Setting implicit wait on managed drivers');
    for (const driver of this.managedDrivers) {
      if (typeof driver.setImplicitWait === 'function') {
        driver.setImplicitWait(ms);
      }
    }
  }
}

/**
 * Set the new command timeout
 *
 * @param ms - the timeout in ms
 */
export function setNewCommandTimeout<C extends Constraints>(this: BaseDriver<C>, ms: number): void {
  this.newCommandTimeoutMs = ms;
  this.log.debug(`Set new command timeout to ${ms}ms`);
  if (this.managedDrivers?.length) {
    this.log.debug('Setting new command timeout on managed drivers');
    for (const driver of this.managedDrivers) {
      if (typeof driver.setNewCommandTimeout === 'function') {
        driver.setNewCommandTimeout(ms);
      }
    }
  }
}

/**
 * Periodically retry an async function up until the currently set implicit wait timeout
 *
 * @param condFn - the behaviour to retry until it returns truthy
 *
 * @returns The return value of the condition
 */
export async function implicitWaitForCondition<C extends Constraints>(
  this: BaseDriver<C>,
  condFn: (...args: any[]) => Promise<any>,
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
}

/**
 * Get a timeout value from a number or a string
 *
 * @param ms - the timeout value as a number or a string
 *
 * @returns The timeout as a number in ms
 */
export function parseTimeoutArgument<C extends Constraints>(this: BaseDriver<C>, ms: number | string): number {
  const duration = parseInt(String(ms), 10);
  if (Number.isNaN(duration) || duration < MIN_TIMEOUT) {
    throw new errors.UnknownError(`Invalid timeout value '${ms}'`);
  }
  return duration;
}
