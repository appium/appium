import _ from 'lodash';
import {createSupportsColor} from 'supports-color';
import {Console as NodeConsole} from 'node:console';
import type {Color} from '@colors/colors';
import '@colors/colors';
import symbols from 'log-symbols';
import {Writable} from 'node:stream';
import type {InspectOptions} from 'node:util';
import type {JsonValue} from 'type-fest';

/** Symbol keys from log-symbols used for decoration */
type SymbolKey = keyof typeof symbols;

/**
 * Options for {@linkcode CliConsole}.
 *
 * @see https://npm.im/supports-color
 */
export interface ConsoleOpts {
  /** If _truthy_, suppress all output except JSON (use {@linkcode CliConsole#json}), which writes to `STDOUT`. */
  jsonMode?: boolean;
  /** If _falsy_, do not use fancy symbols. */
  useSymbols?: boolean;
  /** If _falsy_, do not use color output. If _truthy_, forces color output. By default, checks terminal/TTY for support via pkg `supports-color`. Ignored if `useSymbols` is `false`. */
  useColor?: boolean;
}

/**
 * Stream to nowhere. Used when we want to disable any output other than JSON output.
 */
class NullWritable extends Writable {
  /* eslint-disable promise/prefer-await-to-callbacks -- Node stream callback API */
  override _write(
    chunk: unknown,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    setImmediate(callback);
  }
  /* eslint-enable promise/prefer-await-to-callbacks */
}

/**
 * A particular console/logging class for Appium's CLI.
 *
 * - By default, uses some fancy symbols
 * - Writes to `STDERR`, generally.
 * - In "JSON mode", `STDERR` is squelched. Use {@linkcode CliConsole.json} to write the JSON.
 *
 * DO NOT extend this to do anything other than what it already does. Download a library or something.
 */
export class CliConsole {
  readonly #console: InstanceType<typeof NodeConsole>;
  readonly #useSymbols: boolean;
  readonly #useColor: boolean;

  static readonly symbolToColor: Record<SymbolKey, keyof Color> = {
    success: 'green',
    info: 'cyan',
    warning: 'yellow',
    error: 'red',
  };

  constructor(opts: ConsoleOpts = {}) {
    const {jsonMode = false, useSymbols = true, useColor} = opts;
    this.#console = new NodeConsole(
      process.stdout,
      jsonMode ? new NullWritable() : process.stderr
    );
    this.#useSymbols = Boolean(useSymbols);
    this.#useColor = Boolean(useColor ?? createSupportsColor(process.stderr));
  }

  /**
   * Wraps a message string in breathtaking fanciness
   *
   * Returns `undefined` if `msg` is `undefined`.
   */
  decorate(msg: string | undefined, symbol?: SymbolKey): string | undefined {
    if (!_.isString(msg) || !_.isString(symbol) || !this.#useSymbols) {
      return msg;
    }

    let newMsg = `${symbols[symbol]} ${msg}`;
    if (this.#useColor) {
      const color = CliConsole.symbolToColor[symbol];
      // @colors/colors extends String with color getters (e.g. .green, .red)
      newMsg = (newMsg as unknown as Record<string, string>)[color] ?? newMsg;
    }
    return newMsg;
  }

  /**
   * Writes to `STDOUT`.  Must be stringifyable.
   *
   * You probably don't want to call this more than once before exiting (since that will output invalid JSON).
   */
  json(value: JsonValue): void {
    this.#console.log(JSON.stringify(value));
  }

  /** General logging function. */
  log(message?: string, ...args: unknown[]): void {
    this.#console.error(message, ...args);
  }

  /** A "success" message */
  ok(message?: string, ...args: unknown[]): void {
    this.#console.error(this.decorate(message, 'success'), ...args);
  }

  /** Alias for {@linkcode CliConsole.log} */
  debug(message?: string, ...args: unknown[]): void {
    this.log(message, ...args);
  }

  /** Wraps {@link console.dir} */
  dump(item: unknown, opts?: InspectOptions): void {
    this.#console.dir(item, opts);
  }

  /** An "info" message */
  info(message?: string, ...args: unknown[]): void {
    this.log(this.decorate(message, 'info'), ...args);
  }

  /** A "warning" message */
  warn(message?: string, ...args: unknown[]): void {
    this.log(this.decorate(message, 'warning'), ...args);
  }

  /** An "error" message */
  error(message?: string, ...args: unknown[]): void {
    this.log(this.decorate(message, 'error'), ...args);
  }
}

export const console = new CliConsole();
export {symbols};
