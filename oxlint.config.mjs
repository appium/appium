import appiumConfig, {defineConfig, ignorePatterns as appiumIgnorePatterns} from '@appium/oxtools-config/oxlint';

export default defineConfig({
  extends: [appiumConfig],
  ignorePatterns: [
    ...appiumIgnorePatterns,
    'packages/appium/docs/**/assets/**',
    'packages/appium/docs/**/js/**',
    'packages/appium/sample-code/**',
  ],
});
