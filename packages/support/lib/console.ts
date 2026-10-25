import {Console as NodeConsole} from 'node:console';
import {type InspectOptions, styleText as nodeStyleText} from 'node:util';

import type {JsonValue} from '@appium/types';

import {isUnicodeSupported, NullWritable, streamSupportsColor, stripAnsi} from './internal/index.js';

/** ANSI styles supported by Node's `util.styleText`. `grey` is accepted as an alias for `gray`. */
export type TextStyle =
  | 'reset'
  | 'bold'
  | 'dim'
  | 'italic'
  | 'underline'
  | 'blink'
  | 'inverse'
  | 'hidden'
  | 'strikethrough'
  | 'doubleunderline'
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray'
  | 'grey'
  | 'bgBlack'
  | 'bgRed'
  | 'bgGreen'
  | 'bgYellow'
  | 'bgBlue'
  | 'bgMagenta'
  | 'bgCyan'
  | 'bgWhite'
  | 'framed'
  | 'overlined'
  | 'redBright'
  | 'greenBright'
  | 'yellowBright'
  | 'blueBright'
  | 'magentaBright'
  | 'cyanBright'
  | 'whiteBright';

/** Applies terminal styling via Node's `util.styleText`. */
export function styleText(style: TextStyle, text: string): string {
  const format = style === 'grey' ? 'gray' : style;
  return nodeStyleText(format, text);
}

/** Removes ANSI escape sequences (CSI and OSC) from a string. */
export function stripColors(text: string): string {
  return stripAnsi(text);
}

const UNICODE = isUnicodeSupported();

const logSymbols = {
  info: UNICODE ? 'ℹ' : 'i',
  success: UNICODE ? '✔' : '√',
  warning: UNICODE ? '⚠' : '‼',
  error: UNICODE ? '✖' : '×',
} as const;

/** Options for {@linkcode CliConsole}. */
export interface ConsoleOpts {
  /** If _truthy_, suppress all output except JSON (use {@linkcode CliConsole#json}), which writes to `STDOUT`. */
  jsonMode?: boolean;
  /** If _falsy_, do not use fancy symbols. */
  useSymbols?: boolean;
  /** If _falsy_, do not use color output. If _truthy_, forces color output. By default, checks `NO_COLOR`, `FORCE_COLOR`, `TERM`, and stdout TTY. Ignored if `useSymbols` is `false`. */
  useColor?: boolean;
}

/** Symbol keys used for decoration */
type SymbolKey = keyof typeof logSymbols;

/**
 * A particular console/logging class for Appium's CLI.
 *
 * - By default, uses some fancy symbols
 * - Writes to `STDOUT`, except for {@linkcode CliConsole#error}, which writes to `STDERR`.
 * - In "JSON mode", regular output is squelched. Use {@linkcode CliConsole.json} to write the JSON to `STDOUT`.
 *
 * DO NOT extend this to do anything other than what it already does. Download a library or something.
 */
export class CliConsole {
  static readonly symbolToColor: Record<SymbolKey, TextStyle> = {
    success: 'green',
    info: 'cyan',
    warning: 'yellow',
    error: 'red',
  };

  private readonly console: InstanceType<typeof NodeConsole>;
  private readonly jsonConsole: InstanceType<typeof NodeConsole>;
  private readonly useSymbols: boolean;
  private readonly useColor: boolean;

  constructor(opts: ConsoleOpts = {}) {
    const {jsonMode = false, useSymbols = true, useColor} = opts;
    const nullStream = new NullWritable();
    this.console = new NodeConsole(jsonMode ? nullStream : process.stdout, jsonMode ? nullStream : process.stderr);
    // json() must always reach real STDOUT, even in JSON mode where `console` is squelched.
    this.jsonConsole = new NodeConsole(process.stdout, nullStream);
    this.useSymbols = Boolean(useSymbols);
    this.useColor = Boolean(useColor ?? streamSupportsColor(process.stdout));
  }

  /**
   * Wraps a message string in breathtaking fanciness
   *
   * Returns `undefined` if `msg` is `undefined`.
   */
  decorate(msg: string | undefined, symbol?: SymbolKey): string | undefined {
    if (typeof msg !== 'string' || typeof symbol !== 'string' || !this.useSymbols) {
      return msg;
    }

    let newMsg = `${logSymbols[symbol]} ${msg}`;
    if (this.useColor) {
      newMsg = styleText(CliConsole.symbolToColor[symbol], newMsg);
    }
    return newMsg;
  }

  /**
   * Writes to `STDOUT`.  Must be stringifyable.
   *
   * You probably don't want to call this more than once before exiting (since that will output invalid JSON).
   */
  json(value: JsonValue): void {
    this.jsonConsole.log(JSON.stringify(value));
  }

  /** General logging function. Writes to `STDOUT`. */
  log(message?: string, ...args: unknown[]): void {
    this.console.log(message, ...args);
  }

  /** A "success" message */
  ok(message?: string, ...args: unknown[]): void {
    this.log(this.decorate(message, 'success'), ...args);
  }

  /** Alias for {@linkcode CliConsole.log} */
  debug(message?: string, ...args: unknown[]): void {
    this.log(message, ...args);
  }

  /** Wraps {@link console.dir} */
  dump(item: unknown, opts?: InspectOptions): void {
    this.console.dir(item, opts);
  }

  /** An "info" message */
  info(message?: string, ...args: unknown[]): void {
    this.log(this.decorate(message, 'info'), ...args);
  }

  /** A "warning" message */
  warn(message?: string, ...args: unknown[]): void {
    this.log(this.decorate(message, 'warning'), ...args);
  }

  /** An "error" message. Writes to `STDERR`. */
  error(message?: string, ...args: unknown[]): void {
    this.console.error(this.decorate(message, 'error'), ...args);
  }
}

export const console = new CliConsole();
export {logSymbols, logSymbols as symbols};
