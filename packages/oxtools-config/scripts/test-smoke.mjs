import path from 'node:path';

import appiumOxfmtConfig, {
  createFormatOptions,
  defineConfig as defineOxfmtConfig,
  editorConfigFallbacks,
  hasEditorConfig,
  ignorePatterns as oxfmtIgnorePatterns,
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

const monorepoRoot = path.resolve(import.meta.dirname, '../../..');
const optionsWithoutEditorConfig = createFormatOptions('/tmp/no-editorconfig-here');
if (optionsWithoutEditorConfig.printWidth !== 120) {
  throw new Error('expected editorConfigFallbacks when .editorconfig is absent');
}

const optionsWithEditorConfig = createFormatOptions(monorepoRoot);
if (optionsWithEditorConfig.printWidth !== undefined) {
  throw new Error('expected .editorconfig-mapped options to stay unset when .editorconfig is present');
}

if (!hasEditorConfig(monorepoRoot)) {
  throw new Error('expected monorepo root to have .editorconfig');
}
