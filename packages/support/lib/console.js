import _ from 'lodash';
import {supportsColor} from 'supports-color';
import {Console as NodeConsole} from 'console';
import '@colors/colors';
import symbols from 'log-symbols';
import {Writable} from 'stream';

/**
 * Stream to nowhere. Used when we want to disable any output other than JSON output.
 */
class NullWritable extends Writable {
  // eslint-disable-next-line promise/prefer-await-to-callbacks
  _write(chunk, encoding, callback) {
    setImmediate(callback);
  }
}

/**
 * A particular console/logging class for Appium's CLI.
 *
 * - By default, uses some fancy symbols
 * - Writes to `STDERR`, generally.
 * - In "JSON mode", `STDERR` is squelched. Use {@linkcode Console.json} to write the JSON.
 *
 * DO NOT extend this to do anything other than what it already does. Download a library or something.
 */
export class CliConsole {
  /**
   * Internal console
   * @type {globalThis.Console}
   */
  #console;

  /**
   * Whether or not to use fancy symbols when logging.
   * @type {boolean}
   *
   */
  #useSymbols;

  /**
   * Whether or not to use color.
   */
  #useColor;

  /**
   * @type {Record<keyof typeof symbols,keyof Extract<import('@colors/colors').Color, 'string'>>}
   */
  static symbolToColor = {
    success: 'green',
    info: 'cyan',
    warning: 'yellow',
    error: 'red',
  };

  /**
   *
   * @param {ConsoleOpts} opts
   */
  constructor({jsonMode = false, useSymbols = true, useColor} = {}) {
    this.#console = new NodeConsole(process.stdout, jsonMode ? new NullWritable() : process.stderr);
    this.#useSymbols = Boolean(useSymbols);
    this.#useColor = Boolean(useColor ?? supportsColor(process.stderr));
  }

  /**
   * Wraps a message string in breathtaking fanciness
   *
   * Returns `undefined` if `msg` is `undefined`.
   * @param {string} [msg] - Message to decorate, if anything
   * @param {keyof typeof CliConsole['symbolToColor']} [symbol] - Symbol to use
   * @returns {string|undefined}
   */
  decorate(msg, symbol) {
    if (_.isString(msg)) {
      let newMsg = /** @type {string} */ (msg);
      if (_.isString(symbol) && this.#useSymbols) {
        newMsg = `${symbols[symbol]} ${newMsg}`;
        if (this.#useColor) {
          newMsg = newMsg[CliConsole.symbolToColor[symbol]];
        }
      }
      return newMsg;
    }
    return msg;
  }

  /**
   * Writes to `STDOUT`.  Must be stringifyable.
   *
   * You probably don't want to call this more than once before exiting (since that will output invalid JSON).
   * @param {import('type-fest').JsonValue} value
   */
  json(value) {
    this.#console.log(JSON.stringify(value));
  }

  /**
   * General logging function.
   * @param {string} [message]
   * @param {...any} args
   */
  log(message, ...args) {
    this.#console.error(message, ...args);
  }

  /**
   * A "success" message
   * @param {string} [message]
   * @param {...any} args
   */
  ok(message, ...args) {
    this.#console.error(this.decorate(message, 'success'), ...args);
  }

  /**
   * Alias for {@linkcode Console.log}
   * @param {string} [message]
   * @param {...any} args
   */
  debug(message, ...args) {
    this.log(message, ...args);
  }

  /**
   * Wraps {@link console.dir}
   * @param {any} item
   * @param {import('util').InspectOptions} [opts]
   */
  dump(item, opts) {
    this.#console.dir(item, opts);
  }

  /**
   * An "info" message
   * @param {string} [message]
   * @param {...any} args
   */
  info(message, ...args) {
    this.log(this.decorate(message, 'info'), ...args);
  }

  /**
   * A "warning" message
   * @param {string} [message]
   * @param {...any} args
   */
  warn(message, ...args) {
    this.log(this.decorate(message, 'warning'), ...args);
  }

  /**
   * An "error" message
   * @param {string} [message]
   * @param {...any} args
   */
  error(message, ...args) {
    this.log(this.decorate(message, 'error'), ...args);
  }
}

/**
 * Options for {@linkcode CliConsole}.
 *
 * @typedef ConsoleOpts
 * @property {boolean} [jsonMode] - If _truthy_, supress all output except JSON (use {@linkcode CliConsole#json}), which writes to `STDOUT`.
 * @property {boolean} [useSymbols] - If _falsy_, do not use fancy symbols.
 * @property {boolean} [useColor] - If _falsy_, do not use color output. If _truthy_, forces color output. By default, checks terminal/TTY for support via pkg `supports-color`. Ignored if `useSymbols` is `false`.
 * @see https://npm.im/supports-color
 */

export const console = new CliConsole();
export {symbols};
