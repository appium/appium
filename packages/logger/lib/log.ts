import _ from 'lodash';
import {EventEmitter} from 'node:events';
// @ts-ignore This module does not provide type definitions
import setBlocking from 'set-blocking';
// @ts-ignore This module does not provide type definitions
import consoleControl from 'console-control-strings';
import * as util from 'node:util';
import type {
  MessageObject,
  StyleObject,
  Logger,
  LogLevel,
  PreprocessingRulesLoadResult,
  LogFiltersConfig
} from './types';
import type {Writable} from 'node:stream';
import {AsyncLocalStorage} from 'node:async_hooks';
import { unleakString } from './utils';
import {
  DEFAULT_SECURE_REPLACER,
  SecureValuesPreprocessor
} from './secure-values-preprocessor';
import { LRUCache } from 'lru-cache';

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

export class Log extends EventEmitter implements Logger {
  level: LogLevel | string;
  prefixStyle: StyleObject;
  headingStyle: StyleObject;
  heading: string;
  stream: Writable; // Defaults to process.stderr

  _asyncStorage: AsyncLocalStorage<Record<string, any>>;
  _colorEnabled?: boolean;
  _buffer: MessageObject[];
  _style: Record<LogLevel | string, StyleObject | undefined>;
  _levels: Record<LogLevel | string, number>;
  _disp: Record<LogLevel | string, number | string>;
  _id: number;
  _paused: boolean;
  _secureValuesPreprocessor: SecureValuesPreprocessor;

  private _history: LRUCache<number, MessageObject>;
  private _maxRecordSize: number;

  constructor() {
    super();

    this.level = 'info';
    this._buffer = [];
    this._maxRecordSize = DEFAULT_HISTORY_SIZE;
    this._history = new LRUCache({max: this.maxRecordSize});
    this.stream = process.stderr;
    this.heading = '';
    this.prefixStyle = {fg: 'magenta'};
    this.headingStyle = {fg: 'white', bg: 'black'};
    this._id = 0;
    this._paused = false;
    this._asyncStorage = new AsyncLocalStorage();
    this._secureValuesPreprocessor = new SecureValuesPreprocessor();

    this._style = {};
    this._levels = {};
    this._disp = {};
    this.initDefaultLevels();

    // allow 'error' prefix
    this.on('error', () => {});
  }

  get record(): MessageObject[] {
    return [...this._history.rvalues()] as MessageObject[];
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

  private useColor(): boolean {
    // by default, decide based on tty-ness.
    return (
      this._colorEnabled ?? Boolean(this.stream && 'isTTY' in this.stream && this.stream.isTTY)
    );
  }

  get asyncStorage(): AsyncLocalStorage<Record<string, any>> {
    return this._asyncStorage;
  }

  updateAsyncStorage(contextInfo: Record<string, any>, replace: boolean): void {
    if (!_.isPlainObject(contextInfo)) {
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

  // this functionality has been deliberately disabled
  enableUnicode(): void {}
  disableUnicode(): void {}
  enableProgress(): void {}
  disableProgress(): void {}
  progressEnabled(): boolean {
    return false;
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
    rulesJsonPath: string | string[] | LogFiltersConfig
  ): Promise<PreprocessingRulesLoadResult> {
    const issues = await this._secureValuesPreprocessor.loadRules(rulesJsonPath);
    return {
      issues,
      rules: _.cloneDeep(this._secureValuesPreprocessor.rules),
    };
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

    // If 'disp' is null or undefined, use the lvl as a default
    // Allows: '', 0 as valid disp
    const disp = this._disp[m.level];
    this.clearProgress();
    for (const line of m.message.split(/\r?\n/)) {
      const heading = this.heading;
      if (heading) {
        this.write(heading, this.headingStyle);
        this.write(' ');
      }
      this.write(String(disp), this._style[m.level]);
      const p = m.prefix || '';
      if (p) {
        this.write(' ');
      }

      this.write(p, this.prefixStyle);
      this.write(` ${line}\n`);
    }
    this.showProgress();
  }

  private _format(msg: string, style: StyleObject = {}): string | undefined {
    if (!this.stream) {
      return;
    }

    let output = '';
    if (this.useColor()) {
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
        output += consoleControl.color(settings);
      }
      if (style.bell) {
        output += consoleControl.beep();
      }
    }
    output += msg;
    if (this.useColor()) {
      output += consoleControl.color('reset');
    }
    return output;
  }

  private write(msg: string, style: StyleObject = {}): void {
    if (!this.stream) {
      return;
    }

    const formatted = this._format(msg, style);
    if (formatted !== undefined) {
      this.stream.write(formatted);
    }
  }

  private initDefaultLevels(): void {
    for (const [level, index, style, disp] of DEFAULT_LOG_LEVELS) {
      this._levels[level] = index;
      this._style[level] = style;
      this._disp[level] = disp ?? level;
    }
  }

  private _formatLogArgument(arg: any): ArgumentFormatResult {
    const result: ArgumentFormatResult = {
      arg,
      stack: undefined,
    };

    // mask sensitive data
    if (_.has(result.arg, SENSITIVE_MESSAGE_KEY)) {
      const { isSensitive } = this._asyncStorage.getStore() ?? {};
      result.arg = isSensitive ? DEFAULT_SECURE_REPLACER : result.arg[SENSITIVE_MESSAGE_KEY];
    }

    // resolve stack traces to a plain string
    if (_.isError(result.arg) && result.arg.stack) {
      result.stack = result.arg.stack + '';
      Object.defineProperty(result.arg, 'stack', {
        value: result.stack,
        enumerable: true,
        writable: true,
      });
    }

    return result;
  }

  // this functionality has been deliberately disabled
  private clearProgress(): void {}
  private showProgress(): void {}
}

export function markSensitive<T=any>(logMessage: T): {[SENSITIVE_MESSAGE_KEY]: T} {
  return {[SENSITIVE_MESSAGE_KEY]: logMessage};
}

interface ArgumentFormatResult {
  arg: any,
  stack: string | undefined,
}

export const GLOBAL_LOG = new Log();
export default GLOBAL_LOG;
