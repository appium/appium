import {Console as NodeConsole} from 'node:console';
import {Writable} from 'node:stream';
import {styleText as nodeStyleText, type InspectOptions} from 'node:util';
import type {JsonValue} from 'type-fest';

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

// CSI (Control Sequence Introducer) and OSC (Operating System Command) per ECMA-48.
const ANSI_CSI_RE = // eslint-disable-next-line no-control-regex
  /\x1b\[[0-?]*[ -/]*[@-~]/g;
const ANSI_OSC_RE = // eslint-disable-next-line no-control-regex
  /\x1b\][^\x07]*(?:\x07|\x1b\\)/g;

/** Applies terminal styling via Node's `util.styleText`. */
export function styleText(style: TextStyle, text: string): string {
  const format = style === 'grey' ? 'gray' : style;
  return nodeStyleText(format, text);
}

/** Removes ANSI escape sequences (CSI and OSC) from a string. */
export function stripColors(text: string): string {
  return text.replace(ANSI_OSC_RE, '').replace(ANSI_CSI_RE, '');
}

function isUnicodeSupported(): boolean {
  if (process.env.TERM === 'dumb') {
    return false;
  }
  if (process.platform === 'win32') {
    return Boolean(
      process.env.CI ||
      process.env.WT_SESSION ||
      process.env.TERMINAL_EMULATOR === 'JetBrains-JediTerm' ||
      process.env.TERM_PROGRAM === 'vscode',
    );
  }
  return true;
}

const UNICODE = isUnicodeSupported();

/** Returns whether stderr should use ANSI color by default. */
function stderrSupportsColor(stream: {isTTY?: boolean} = process.stderr): boolean {
  const {env} = process;
  if (env.NO_COLOR !== undefined || env.NODE_DISABLE_COLORS !== undefined) {
    return false;
  }
  const {FORCE_COLOR: forceColor} = env;
  if (forceColor !== undefined) {
    const normalized = forceColor.toLowerCase();
    return normalized !== '0' && normalized !== 'false';
  }
  if (env.TERM === 'dumb') {
    return false;
  }
  if (!stream.isTTY) {
    return false;
  }
  return true;
}

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
  /** If _falsy_, do not use color output. If _truthy_, forces color output. By default, checks `NO_COLOR`, `FORCE_COLOR`, `TERM`, and stderr TTY. Ignored if `useSymbols` is `false`. */
  useColor?: boolean;
}

/** Symbol keys used for decoration */
type SymbolKey = keyof typeof logSymbols;

/**
 * Stream to nowhere. Used when we want to disable any output other than JSON output.
 */
class NullWritable extends Writable {
  /* eslint-disable promise/prefer-await-to-callbacks -- Node stream callback API */
  override _write(
    chunk: unknown,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
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
  static readonly symbolToColor: Record<SymbolKey, TextStyle> = {
    success: 'green',
    info: 'cyan',
    warning: 'yellow',
    error: 'red',
  };

  readonly #console: InstanceType<typeof NodeConsole>;
  readonly #useSymbols: boolean;
  readonly #useColor: boolean;

  constructor(opts: ConsoleOpts = {}) {
    const {jsonMode = false, useSymbols = true, useColor} = opts;
    this.#console = new NodeConsole(process.stdout, jsonMode ? new NullWritable() : process.stderr);
    this.#useSymbols = Boolean(useSymbols);
    this.#useColor = Boolean(useColor ?? stderrSupportsColor(process.stderr));
  }

  /**
   * Wraps a message string in breathtaking fanciness
   *
   * Returns `undefined` if `msg` is `undefined`.
   */
  decorate(msg: string | undefined, symbol?: SymbolKey): string | undefined {
    if (typeof msg !== 'string' || typeof symbol !== 'string' || !this.#useSymbols) {
      return msg;
    }

    let newMsg = `${logSymbols[symbol]} ${msg}`;
    if (this.#useColor) {
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
export {logSymbols, logSymbols as symbols};
