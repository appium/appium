import appiumFmtConfig, {fmtIgnorePatterns} from '@appium/oxtools-config/oxfmt';

export default {
  ...appiumFmtConfig,
  ignorePatterns: [
    ...fmtIgnorePatterns,
    'packages/appium/docs/**',
    'packages/schema/lib/appium-config.schema.json',
    'packages/types/lib/appium-config.ts',
  ],
};
