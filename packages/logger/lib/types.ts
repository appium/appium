import type {AsyncLocalStorage} from 'node:async_hooks';
import type {EventEmitter} from 'node:events';
import type {Writable} from 'node:stream';

export interface Logger extends EventEmitter {
  /** Minimum severity that gets written out; messages below this level are dropped. @default 'info' */
  level: string;
  /** The most recent log messages, newest first, capped at {@linkcode Logger.maxRecordSize}. */
  record: MessageObject[];
  /** Maximum number of messages kept in {@linkcode Logger.record}. Shrinking it evicts the oldest entries. */
  maxRecordSize: number;
  /** Style applied to the level tag's prefix segment (e.g. a request/session id) written before each message. */
  prefixStyle: StyleObject;
  /** Style applied to {@linkcode Logger.heading}. */
  headingStyle: StyleObject;
  /** Optional text written before the level tag on every line. Empty disables it. @default '' */
  heading: string;
  /**
   * Output destination for messages below {@linkcode Logger.stderrLevel}.
   * Set to `null` to drop them (e.g. once a custom sink like Winston takes over).
   * @default process.stderr
   */
  stream: Writable | null;
  /**
   * Output destination for messages at/above {@linkcode Logger.stderrLevel}.
   * Set to `null` to drop them (e.g. once a custom sink like Winston takes over).
   * @default process.stderr
   */
  errorStream: Writable | null;
  /**
   * Minimum severity (inclusive) routed to {@linkcode Logger.errorStream} instead of {@linkcode Logger.stream}.
   * Comparison is by the level's numeric severity (see {@linkcode Logger.addLevel}), so a custom level more
   * severe than this threshold is routed to `errorStream` too, without needing to name it explicitly.
   * @default 'error'
   */
  stderrLevel: string;

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

  /**
   * Loads secure-value replacement rules used to redact sensitive data from log messages.
   * Replaces any previously loaded rules.
   * @param rulesJsonPath Path (or paths) to a rules JSON file, or the rules themselves
   */
  loadSecureValuesPreprocessingRules(
    rulesJsonPath: string | string[] | LogFiltersConfig,
  ): Promise<PreprocessingRulesLoadResult>;

  /** Forces ANSI color output on, regardless of the output stream's TTY-ness. */
  enableColor(): void;
  /** Forces ANSI color output off, regardless of the output stream's TTY-ness. */
  disableColor(): void;

  /** Buffers subsequent messages instead of writing them, until {@linkcode Logger.resume} is called. */
  pause(): void;
  /** Stops buffering and flushes any messages queued since {@linkcode Logger.pause}, in order. */
  resume(): void;

  /**
   * Registers a custom level and, if not already present, a same-named logging method
   * (e.g. `addLevel('custom', level)` enables `log.custom(prefix, message)`).
   * @param level Level name
   * @param n Numeric severity used both for level-gating and for the `stderrLevel` comparison
   * @param style Optional display style for the level tag
   * @param disp Optional level tag text; defaults to `level`
   */
  addLevel(level: string, n: number, style?: StyleObject, disp?: string): void;

  /**
   * Merges (or replaces) values into the logger's `AsyncLocalStorage`-backed context for the
   * current asynchronous call chain, e.g. to attach a request/session id to subsequent log lines.
   * @param contextInfo Key-value pairs to store
   * @param replace If `true`, replaces the existing context instead of merging into it
   */
  updateAsyncStorage(contextInfo: Record<string, any>, replace: boolean): void;

  /** The `AsyncLocalStorage` backing {@linkcode Logger.updateAsyncStorage}. */
  get asyncStorage(): AsyncLocalStorage<Record<string, any>>;

  // Allows for custom log levels
  // log.addLevel("custom", level)
  // log.custom(prefix, message)
  [key: string]: any;
}

/** Built-in severities, from least to most severe (`silent` never produces output). */
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

/** ANSI display style for a level tag or heading. */
export interface StyleObject {
  /** Foreground color name (e.g. `'red'`). */
  fg?: string;
  /** Background color name (e.g. `'black'`). */
  bg?: string;
  bold?: boolean;
  inverse?: boolean;
  underline?: boolean;
  /** Emit a terminal bell character alongside the styled text. */
  bell?: boolean;
}

/** A single formatted log entry, as emitted on the `'log'`/`'log.<level>'`/`'<prefix>'` events and stored in {@linkcode Logger.record}. */
export interface MessageObject {
  /** Monotonically increasing id, unique per {@linkcode Logger} instance. */
  id: number;
  /** `Date.now()` at the time the message was logged. */
  timestamp: number;
  level: string;
  prefix: string;
  /** The fully formatted message text (after `util.format()` and secure-value redaction). */
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
