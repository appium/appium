import {AsyncLocalStorage} from 'node:async_hooks';
import {EventEmitter} from 'node:events';
import type {Writable} from 'node:stream';
import * as util from 'node:util';

import {LRUCache} from 'lru-cache';

import {DEFAULT_SECURE_REPLACER, SecureValuesPreprocessor} from './secure-values-preprocessor.js';
import type {
  LogFiltersConfig,
  Logger,
  LogLevel,
  MessageObject,
  PreprocessingRulesLoadResult,
  StyleObject,
} from './types.js';
import {ansiBeep, ansiColor, isPlainObject, setBlocking, unleakString} from './utils/index.js';

const DEFAULT_LOG_LEVELS = [
  ['silly', -Infinity, {inverse: true}, 'sill'],
  ['verbose', 1000, {fg: 'cyan', bg: 'black'}, 'verb'],
  ['debug', 1500, {fg: 'cyan', bg: 'black'}, 'dbug'],
  ['info', 2000, {fg: 'green'}],
  ['timing', 2500, {fg: 'green', bg: 'black'}],
  ['http', 3000, {fg: 'green', bg: 'black'}],
  ['notice', 3500, {fg: 'cyan', bg: 'black'}],
  ['warn', 4000, {fg: 'black', bg: 'yellow'}, 'WARN'],
  ['error', 5000, {fg: 'red', bg: 'black'}, 'ERR!'],
  ['silent', Infinity],
] as const;
const DEFAULT_HISTORY_SIZE = 10000;
const SENSITIVE_MESSAGE_KEY = 'f2b06625-35a2-4ed3-939a-b0b0a4abc750';

setBlocking(true);

interface ArgumentFormatResult {
  arg: any;
  stack: string | undefined;
}

export class Log extends EventEmitter implements Logger {
  level: LogLevel | string = 'info';
  prefixStyle: StyleObject = {fg: 'magenta'};
  headingStyle: StyleObject = {fg: 'white', bg: 'black'};
  heading = '';
  stream: Writable | null = process.stdout; // Output for levels below `stderrLevel`. Set to null when using custom output (e.g. Winston)
  errorStream: Writable | null = process.stderr; // Output for levels at/above `stderrLevel`. Set to null when using custom output (e.g. Winston)
  stderrLevel: LogLevel | string = 'error'; // Minimum severity (inclusive) routed to `errorStream` instead of `stream`

  private _asyncStorage: AsyncLocalStorage<Record<string, any>> = new AsyncLocalStorage();
  private _colorEnabled?: boolean;
  private _buffer: MessageObject[] = [];
  private _style: Record<LogLevel | string, StyleObject | undefined> = Object.fromEntries(
    DEFAULT_LOG_LEVELS.map(([level, , style]) => [level, style]),
  );
  private _levels: Record<LogLevel | string, number> = Object.fromEntries(
    DEFAULT_LOG_LEVELS.map(([level, index]) => [level, index]),
  );
  private _disp: Record<LogLevel | string, number | string> = Object.fromEntries(
    DEFAULT_LOG_LEVELS.map(([level, , , disp]) => [level, disp ?? level]),
  );
  private _id = 0;
  private _paused = false;
  private _secureValuesPreprocessor: SecureValuesPreprocessor = new SecureValuesPreprocessor();

  private _history: LRUCache<number, MessageObject> = new LRUCache({max: DEFAULT_HISTORY_SIZE});
  private _maxRecordSize: number = DEFAULT_HISTORY_SIZE;

  constructor() {
    super();

    // allow 'error' prefix
    this.on('error', () => {});
  }

  get record(): MessageObject[] {
    return [...this._history.rvalues()] as MessageObject[];
  }

  get asyncStorage(): AsyncLocalStorage<Record<string, any>> {
    return this._asyncStorage;
  }

  get maxRecordSize(): number {
    return this._maxRecordSize;
  }

  set maxRecordSize(value: number) {
    if (value === this._maxRecordSize) {
      return;
    }

    this._maxRecordSize = value;
    const newHistory = new LRUCache<number, MessageObject>({max: value});
    for (const [key, value] of this._history.rentries() as Generator<[number, MessageObject]>) {
      newHistory.set(key, value);
    }
    this._history = newHistory;
  }

  updateAsyncStorage(contextInfo: Record<string, any>, replace: boolean): void {
    if (!isPlainObject(contextInfo)) {
      return;
    }
    if (replace) {
      this._asyncStorage.enterWith({...contextInfo});
    } else {
      const store = this._asyncStorage.getStore() ?? {};
      Object.assign(store, contextInfo);
      this._asyncStorage.enterWith(store);
    }
  }

  enableColor(): void {
    this._colorEnabled = true;
  }

  disableColor(): void {
    this._colorEnabled = false;
  }

  /**
   * Temporarily stop emitting, but don't drop
   */
  pause(): void {
    this._paused = true;
  }

  resume(): void {
    if (!this._paused) {
      return;
    }

    this._paused = false;

    const b = this._buffer;
    this._buffer = [];
    for (const m of b) {
      this.emitLog(m);
    }
  }

  silly(prefix: string, message: any, ...args: any[]): void {
    this.log('silly', prefix, message, ...args);
  }

  verbose(prefix: string, message: any, ...args: any[]): void {
    this.log('verbose', prefix, message, ...args);
  }

  debug(prefix: string, message: any, ...args: any[]): void {
    this.log('debug', prefix, message, ...args);
  }

  info(prefix: string, message: any, ...args: any[]): void {
    this.log('info', prefix, message, ...args);
  }

  timing(prefix: string, message: any, ...args: any[]): void {
    this.log('timing', prefix, message, ...args);
  }

  http(prefix: string, message: any, ...args: any[]): void {
    this.log('http', prefix, message, ...args);
  }

  notice(prefix: string, message: any, ...args: any[]): void {
    this.log('notice', prefix, message, ...args);
  }

  warn(prefix: string, message: any, ...args: any[]): void {
    this.log('warn', prefix, message, ...args);
  }

  error(prefix: string, message: any, ...args: any[]): void {
    this.log('error', prefix, message, ...args);
  }

  silent(prefix: string, message: any, ...args: any[]): void {
    this.log('silent', prefix, message, ...args);
  }

  addLevel(level: string, n: number, style?: StyleObject, disp?: string): void {
    this._levels[level] = n;
    this._style[level] = style;
    if (!(this as any)[level]) {
      (this as any)[level] = (prefix: string, message: any, ...args: any[]) => {
        this.log(level, prefix, message, ...args);
      };
    }
    // If 'disp' is null or undefined, use the level as a default
    this._disp[level] = disp ?? level;
  }

  /**
   * Creates a log message
   * @param level
   * @param prefix
   * @param message message of the log which will be formatted using utils.format()
   * @param args additional arguments appended to the log message also formatted using utils.format()
   */
  log(level: LogLevel | string, prefix: string, message: any, ...args: any[]): void {
    const l = this._levels[level];
    if (l === undefined) {
      this.emit('error', new Error(util.format('Undefined log level: %j', level)));
      return;
    }

    const messageArguments: any[] = [];
    let stack: string | undefined;
    for (const arg of [message, ...args]) {
      const result = this._formatLogArgument(arg);
      if (result.stack) {
        stack = result.stack;
      } else {
        messageArguments.push(result.arg);
      }
    }
    if (stack) {
      messageArguments.unshift(`${stack}\n`);
    }
    const formattedMessage = util.format(...messageArguments);

    const m: MessageObject = {
      id: this._id++,
      timestamp: Date.now(),
      level,
      prefix: this._secureValuesPreprocessor.preprocess(unleakString(prefix || '')),
      message: this._secureValuesPreprocessor.preprocess(unleakString(formattedMessage)),
    };

    this.emit('log', m);
    this.emit('log.' + level, m);
    if (m.prefix) {
      this.emit(m.prefix, m);
    }

    this._history.set(m.id, m);
    this.emitLog(m);
  }

  /**
   * Loads the JSON file containing secure values replacement rules.
   * This might be necessary to hide sensitive values that may possibly
   * appear in Appium logs.
   * Each call to this method replaces the previously loaded rules if any existed.
   *
   * @param {string|string[]|LogFiltersConfig} rulesJsonPath The full path to the JSON file containing
   * the replacement rules. Each rule could either be a string to be replaced
   * or an object with predefined properties.
   * @throws {Error} If the given file cannot be loaded
   * @returns {Promise<PreprocessingRulesLoadResult>}
   */
  async loadSecureValuesPreprocessingRules(
    rulesJsonPath: string | string[] | LogFiltersConfig,
  ): Promise<PreprocessingRulesLoadResult> {
    const issues = await this._secureValuesPreprocessor.loadRules(rulesJsonPath);
    return {
      issues,
      rules: structuredClone(this._secureValuesPreprocessor.rules),
    };
  }

  private useColor(stream: Writable | null): boolean {
    // by default, decide based on tty-ness.
    return this._colorEnabled ?? Boolean(stream && 'isTTY' in stream && stream.isTTY);
  }

  /** The stream a message at the given (already-resolved) severity should be written to. */
  private streamFor(severity: number): Writable | null {
    const threshold = this._levels[this.stderrLevel];
    return threshold !== undefined && severity >= threshold ? this.errorStream : this.stream;
  }

  private emitLog(m: MessageObject): void {
    if (this._paused) {
      this._buffer.push(m);
      return;
    }

    const l = this._levels[m.level];
    if (l === undefined) {
      return;
    }
    if (l < this._levels[this.level]) {
      return;
    }
    if (l > 0 && !isFinite(l)) {
      return;
    }

    const stream = this.streamFor(l);
    if (!stream) {
      return;
    }

    // If 'disp' is null or undefined, use the lvl as a default
    // Allows: '', 0 as valid disp
    const disp = this._disp[m.level];
    for (const line of m.message.split(/\r?\n/)) {
      const heading = this.heading;
      if (heading) {
        this.write(stream, heading, this.headingStyle);
        this.write(stream, ' ');
      }
      this.write(stream, String(disp), this._style[m.level]);
      const p = m.prefix || '';
      if (p) {
        this.write(stream, ' ');
      }

      this.write(stream, p, this.prefixStyle);
      this.write(stream, ` ${line}\n`);
    }
  }

  private _format(stream: Writable | null, msg: string, style: StyleObject = {}): string | undefined {
    if (!stream) {
      return;
    }

    let output = '';
    if (this.useColor(stream)) {
      const settings: string[] = [];
      if (style.fg) {
        settings.push(style.fg);
      }
      if (style.bg) {
        settings.push('bg' + style.bg[0].toUpperCase() + style.bg.slice(1));
      }
      if (style.bold) {
        settings.push('bold');
      }
      if (style.underline) {
        settings.push('underline');
      }
      if (style.inverse) {
        settings.push('inverse');
      }
      if (settings.length) {
        output += ansiColor(...settings);
      }
      if (style.bell) {
        output += ansiBeep();
      }
    }
    output += msg;
    if (this.useColor(stream)) {
      output += ansiColor('reset');
    }
    return output;
  }

  private write(stream: Writable | null, msg: string, style: StyleObject = {}): void {
    if (!stream) {
      return;
    }

    const formatted = this._format(stream, msg, style);
    if (formatted !== undefined) {
      stream.write(formatted);
    }
  }

  private _formatLogArgument(arg: any): ArgumentFormatResult {
    const result: ArgumentFormatResult = {
      arg,
      stack: undefined,
    };

    // mask sensitive data
    if (result.arg != null && typeof result.arg === 'object' && Object.hasOwn(result.arg, SENSITIVE_MESSAGE_KEY)) {
      const {isSensitive} = this._asyncStorage.getStore() ?? {};
      result.arg = isSensitive ? DEFAULT_SECURE_REPLACER : result.arg[SENSITIVE_MESSAGE_KEY];
    }

    // resolve stack traces to a plain string
    if (result.arg instanceof Error && result.arg.stack) {
      result.stack = result.arg.stack + '';
      Object.defineProperty(result.arg, 'stack', {
        value: result.stack,
        enumerable: true,
        writable: true,
      });
    }

    return result;
  }
}

/**
 * Wraps a log message so it can be redacted when async storage marks the context as sensitive.
 * @param logMessage - Value to log; may be wrapped for secure display.
 * @returns An object keyed with an internal marker containing the message.
 */
export function markSensitive<T = any>(logMessage: T): {[SENSITIVE_MESSAGE_KEY]: T} {
  return {[SENSITIVE_MESSAGE_KEY]: logMessage};
}

// Unique key for the process-wide logger on globalThis (avoids collisions with other globals).
const GLOBAL_NPMLOG_KEY = 'appium-logger-global-8f4a1c2b-5e6d-4a9b-8c3f-7d2e1b0a9c6e';

type GlobalWithLogger = typeof globalThis & {[K in typeof GLOBAL_NPMLOG_KEY]: Log | undefined};

// Reuse process-wide logger so multiple loads of this module use the same Log instance.
const g = globalThis as GlobalWithLogger;
export const GLOBAL_LOG =
  g[GLOBAL_NPMLOG_KEY] ??
  (() => {
    const log = new Log();
    g[GLOBAL_NPMLOG_KEY] = log;
    return log;
  })();
