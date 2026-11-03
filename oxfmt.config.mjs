import appiumConfig, {defineConfig, ignorePatterns as appiumIgnorePatterns} from '@appium/oxc-config/oxfmt';

export default defineConfig({
  ...appiumConfig,
  ignorePatterns: [
    ...appiumIgnorePatterns,
    'packages/appium/docs/**',
    'packages/schema/lib/appium-config.schema.json',
    'packages/types/lib/appium-config.ts',
  ],
});
