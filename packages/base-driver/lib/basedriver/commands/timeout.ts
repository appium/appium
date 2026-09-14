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
 * @param type - the type of the timeout (deprecated)
 * @param ms - the ms for the timeout (deprecated)
 * @param script - the number in ms for the script timeout, used for the W3C command
 * @param pageLoad - the number in ms for the pageLoad timeout, used for the W3C command
 * @param implicit - the number in ms for the implicit wait timeout, used for the W3C command
 * @param command - the number in ms for the Appium-specific command timeout
 */
export async function timeouts<C extends Constraints>(
  this: BaseDriver<C>,
  /**
   * @deprecated set `script`, `pageLoad`, `implicit` or `command` directly
   */
  type?: string,
  /**
   * @deprecated set `script`, `pageLoad`, `implicit` or `command` directly
   */
  ms?: number | string,
  script?: number,
  pageLoad?: number,
  implicit?: number,
  command?: number,
): Promise<void> {
  if (type && typeof type === 'string' && util.hasValue(ms)) {
    // legacy stuff with some Appium-specific additions
    this.log.warn(
      `The 'type' and 'ms' arguments are deprecated. ` +
        `Please use the 'script', 'pageLoad', 'implicit' and 'command' arguments.`,
    );
    this.log.debug(`Timeout arguments: ${JSON.stringify({type, ms})}`);
    switch (type) {
      case 'command':
        return this.setNewCommandTimeout(this.parseTimeoutArgument(ms));
      case 'implicit':
        return this.setImplicitWait(this.parseTimeoutArgument(ms));
      case 'page load':
        return this.setPageLoadTimeout(this.parseTimeoutArgument(ms));
      case 'script':
        return this.setScriptTimeout(this.parseTimeoutArgument(ms));
      default:
        throw new Error(`'${type}' type is not supported for the timeout API`);
    }
  }

  this.log.debug(`W3C timeout argument: ${JSON.stringify({script, pageLoad, implicit, command})}`);
  if (util.hasValue(script)) {
    this.setScriptTimeout(this.parseTimeoutArgument(script));
  }
  if (util.hasValue(pageLoad)) {
    this.setPageLoadTimeout(this.parseTimeoutArgument(pageLoad));
  }
  if (util.hasValue(implicit)) {
    this.setImplicitWait(this.parseTimeoutArgument(implicit));
  }
  if (util.hasValue(command)) {
    this.setNewCommandTimeout(this.parseTimeoutArgument(command));
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
    script: this.scriptTimeoutMs,
    pageLoad: this.pageLoadTimeoutMs,
    implicit: this.implicitWaitMs,
    command: this.newCommandTimeoutMs,
  };
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
 *  A helper method (not a command) used to set the page load timeout value
 *
 * @param ms - the page load timeout in ms
 */
export function setPageLoadTimeout<C extends Constraints>(this: BaseDriver<C>, ms: number): void {
  this.pageLoadTimeoutMs = ms;
  this.log.debug(`Set page load timeout to ${ms}ms`);
  if (this.managedDrivers?.length) {
    this.log.debug('Setting page load timeout on managed drivers');
    for (const driver of this.managedDrivers) {
      if (typeof driver.setPageLoadTimeout === 'function') {
        driver.setPageLoadTimeout(ms);
      }
    }
  }
}

/**
 *  A helper method (not a command) used to set the script timeout value
 *
 * @param ms - the script timeout in ms
 */
export function setScriptTimeout<C extends Constraints>(this: BaseDriver<C>, ms: number): void {
  this.scriptTimeoutMs = ms;
  this.log.debug(`Set script timeout to ${ms}ms`);
  if (this.managedDrivers?.length) {
    this.log.debug('Setting script timeout on managed drivers');
    for (const driver of this.managedDrivers) {
      if (typeof driver.setScriptTimeout === 'function') {
        driver.setScriptTimeout(ms);
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
    throw new errors.InvalidArgumentError(`Invalid timeout value '${ms}'`);
  }
  return duration;
}
