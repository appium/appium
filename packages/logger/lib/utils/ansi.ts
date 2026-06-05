const PREFIX = '\x1b[';

const CODES: Record<string, number> = {
  reset: 0,
  bold: 1,
  underline: 4,
  inverse: 7,
  white: 37,
  black: 30,
  blue: 34,
  cyan: 36,
  green: 32,
  magenta: 35,
  red: 31,
  yellow: 33,
  bgWhite: 47,
  bgBlack: 40,
  bgBlue: 44,
  bgCyan: 46,
  bgGreen: 42,
  bgMagenta: 45,
  bgRed: 41,
  bgYellow: 43,
};

/** Wraps text in ANSI SGR escape codes for the given styles. */
export function ansiColor(...styles: string[]): string {
  const codes = styles.map((style) => {
    const code = CODES[style];
    if (code == null) {
      throw new Error(`Unknown color or style name: ${style}`);
    }
    return code;
  });
  return `${PREFIX}${codes.join(';')}m`;
}

/** Returns the ASCII bell character. */
export function ansiBeep(): string {
  return '\x07';
}
