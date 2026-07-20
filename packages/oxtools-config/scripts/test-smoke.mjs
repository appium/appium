import appiumOxfmtConfig, {
  defineConfig as defineOxfmtConfig,
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
