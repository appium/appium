import {Writable} from 'node:stream';

// CSI (Control Sequence Introducer) and OSC (Operating System Command) per ECMA-48.
const ANSI_CSI_RE = // eslint-disable-next-line no-control-regex
  /\x1b\[[0-?]*[ -/]*[@-~]/g;
const ANSI_OSC_RE = // eslint-disable-next-line no-control-regex
  /\x1b\][^\x07]*(?:\x07|\x1b\\)/g;

/** Removes ANSI escape sequences (CSI and OSC) from a string. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_OSC_RE, '').replace(ANSI_CSI_RE, '');
}

/** Returns whether the terminal is expected to render unicode symbols. */
export function isUnicodeSupported(): boolean {
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

/** Returns whether the given stream should use ANSI color by default. */
export function streamSupportsColor(stream: {isTTY?: boolean}): boolean {
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

/**
 * Stream to nowhere. Used when we want to disable any output other than JSON output.
 */
export class NullWritable extends Writable {
  /* eslint-disable promise/prefer-await-to-callbacks -- Node stream callback API */
  override _write(chunk: unknown, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    setImmediate(callback);
  }
  /* eslint-enable promise/prefer-await-to-callbacks */
}
