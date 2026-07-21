import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import appiumOxfmtConfig, {
  createFormatOptions,
  defineConfig as defineOxfmtConfig,
  editorConfigFallbacks,
  hasEditorConfig,
  ignorePatterns as oxfmtIgnorePatterns,
  resolveEditorConfigFallbacks,
} from '../oxfmt.mjs';
import appiumOxlintConfig, {
  defineConfig as defineOxlintConfig,
  ignorePatterns as oxlintIgnorePatterns,
} from '../oxlint.mjs';

if (!appiumOxlintConfig?.overrides?.length) {
  throw new Error('invalid oxlint config');
}

if (!oxlintIgnorePatterns?.length) {
  throw new Error('invalid oxlint ignorePatterns');
}

if (typeof defineOxlintConfig !== 'function') {
  throw new Error('invalid oxlint defineConfig');
}

if (!appiumOxfmtConfig?.singleQuote) {
  throw new Error('invalid oxfmt config');
}

if (!oxfmtIgnorePatterns?.length) {
  throw new Error('invalid oxfmt ignorePatterns');
}

if (typeof defineOxfmtConfig !== 'function') {
  throw new Error('invalid oxfmt defineConfig');
}

if (editorConfigFallbacks.printWidth !== 120 || editorConfigFallbacks.endOfLine !== 'lf') {
  throw new Error('invalid editorConfigFallbacks');
}

const optionsWithoutEditorConfig = createFormatOptions(path.join(os.tmpdir(), 'no-editorconfig-here'));
if (optionsWithoutEditorConfig.printWidth !== 120) {
  throw new Error('expected editorConfigFallbacks when .editorconfig is absent');
}

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const optionsWithEditorConfig = createFormatOptions(monorepoRoot);
if (optionsWithEditorConfig.printWidth !== undefined || optionsWithEditorConfig.tabWidth !== undefined) {
  throw new Error('expected fully defined .editorconfig options to stay unset');
}

if (!hasEditorConfig(monorepoRoot)) {
  throw new Error('expected monorepo root to have .editorconfig');
}

const partialEditorConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oxc-config-test-'));
try {
  fs.writeFileSync(path.join(partialEditorConfigDir, '.editorconfig'), `[*]\nindent_size = 2\n`);

  const partialFallbacks = resolveEditorConfigFallbacks(partialEditorConfigDir);
  if (partialFallbacks.tabWidth !== undefined) {
    throw new Error('tabWidth should come from .editorconfig when indent_size is set');
  }
  if (partialFallbacks.printWidth !== 120) {
    throw new Error('printWidth fallback expected when max_line_length is absent');
  }

  const partialOptions = createFormatOptions(partialEditorConfigDir);
  if (partialOptions.printWidth !== 120 || partialOptions.endOfLine !== 'lf') {
    throw new Error('expected per-option fallbacks for unset .editorconfig properties');
  }
} finally {
  fs.rmSync(partialEditorConfigDir, {recursive: true, force: true});
}
