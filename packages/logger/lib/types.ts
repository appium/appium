import type {EventEmitter} from 'node:events';
import type {AsyncLocalStorage} from 'node:async_hooks';

export interface Logger extends EventEmitter {
  level: string;
  record: MessageObject[];
  maxRecordSize: number;
  prefixStyle: StyleObject;
  headingStyle: StyleObject;
  heading: string;
  stream: any; // Defaults to process.stderr

  /**
   * Creates a log message
   * @param level
   * @param prefix
   * @param message message of the log which will be formatted using utils.format()
   * @param args additional arguments appended to the log message also formatted using utils.format()
   */
  log(level: LogLevel | string, prefix: string, message: any, ...args: any[]): void;

  /**
   * @param prefix
   * @param message message of the log which will be formatted using utils.format()
   * @param args additional arguments appended to the log message also formatted using utils.format()
   */
  silly(prefix: string, message: any, ...args: any[]): void;
  verbose(prefix: string, message: any, ...args: any[]): void;
  debug(prefix: string, message: any, ...args: any[]): void;
  info(prefix: string, message: any, ...args: any[]): void;
  timing(prefix: string, message: any, ...args: any[]): void;
  http(prefix: string, message: any, ...args: any[]): void;
  notice(prefix: string, message: any, ...args: any[]): void;
  warn(prefix: string, message: any, ...args: any[]): void;
  error(prefix: string, message: any, ...args: any[]): void;
  silent(prefix: string, message: any, ...args: any[]): void;

  loadSecureValuesPreprocessingRules(
    rulesJsonPath: string | string[] | LogFiltersConfig
  ): Promise<PreprocessingRulesLoadResult>;

  enableColor(): void;
  disableColor(): void;

  enableProgress(): void;
  disableProgress(): void;
  progressEnabled(): boolean;

  enableUnicode(): void;
  disableUnicode(): void;

  pause(): void;
  resume(): void;

  addLevel(level: string, n: number, style?: StyleObject, disp?: string): void;

  updateAsyncStorage(contextInfo: Record<string, any>, replace: boolean): void;

  get asyncStorage(): AsyncLocalStorage<Record<string, any>>;

  // Allows for custom log levels
  // log.addLevel("custom", level)
  // log.custom(prefix, message)
  [key: string]: any;
}

export type LogLevel =
  | 'silly'
  | 'verbose'
  | 'debug'
  | 'info'
  | 'timing'
  | 'http'
  | 'notice'
  | 'warn'
  | 'error'
  | 'silent';

export interface StyleObject {
  fg?: string | undefined;
  bg?: string | undefined;
  bold?: boolean | undefined;
  inverse?: boolean | undefined;
  underline?: boolean | undefined;
  bell?: boolean | undefined;
}

export interface MessageObject {
  id: number;
  timestamp: number;
  level: string;
  prefix: string;
  message: string;
}

export interface SecureValuePreprocessingRule {
  /** The parsed pattern which is going to be used for replacement */
  pattern: RegExp;
  /** The replacer value to use. By default equals to `DEFAULT_SECURE_REPLACER` */
  replacer?: string;
}

export interface PreprocessingRulesLoadResult {
  /**
   * The list of rule parsing issues (one item per rule).
   * Rules with issues are skipped. An empty list is returned if no parsing issues exist.
   */
  issues: string[];
  /**
   * The list of successfully loaded
   * replacement rules. The list could be empty if no rules were loaded.
   */
  rules: SecureValuePreprocessingRule[];
}

export type LogFilter = {
  /**
   * Replacement string for matched text
   */
  replacer?: string;
  /**
   * Matching flags; see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#advanced_searching_with_flags
   */
  flags?: string;
  [k: string]: unknown;
} & (LogFilterText | LogFilterRegex);
/**
 * One or more log filtering rules
 */
export type LogFiltersConfig = LogFilter[];

export interface LogFilterText {
  /**
   * Text to match
   */
  text: string;
  [k: string]: unknown;
}
/**
 * Log filter with regular expression
 */
export interface LogFilterRegex {
  /**
   * Regex pattern to match
   */
  pattern: string;
  [k: string]: unknown;
}
