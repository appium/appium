import _ from 'lodash';
import {EventEmitter} from 'node:events';
// @ts-ignore This module does not provide type definitons
import setBlocking from 'set-blocking';
// @ts-ignore This module does not provide type definitons
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
import { SecureValuesPreprocessor } from './secure-values-preprocessor';

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

setBlocking(true);

export class Log extends EventEmitter implements Logger {
  level: LogLevel | string;
  record: MessageObject[];
  maxRecordSize: number;
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

  constructor() {
    super();

    this.level = 'info';
    this._buffer = [];
    this.record = [];
    this.maxRecordSize = 10000;
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

  private useColor(): boolean {
    // by default, decide based on tty-ness.
    return (
      this._colorEnabled ?? Boolean(this.stream && 'isTTY' in this.stream && this.stream.isTTY)
    );
  }

  get asyncStorage(): AsyncLocalStorage<Record<string, any>> {
    return this._asyncStorage;
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
    let stack: string | null = null;
    for (const formatArg of [message, ...args]) {
      messageArguments.push(formatArg);
      // resolve stack traces to a plain string.
      if (_.isError(formatArg) && formatArg.stack) {
        Object.defineProperty(formatArg, 'stack', {
          value: (stack = formatArg.stack + ''),
          enumerable: true,
          writable: true,
        });
      }
    }
    if (stack) {
      messageArguments.unshift(`${stack}\n`);
    }
    const formattedMessage: string = util.format(...messageArguments);

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

    this.record.push(m);
    const mrs = this.maxRecordSize;
    if (this.record.length > mrs) {
      this.record.shift();
    }

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

  // this functionality has been deliberately disabled
  private clearProgress(): void {}
  private showProgress(): void {}
}

export const GLOBAL_LOG = new Log();
export default GLOBAL_LOG;
