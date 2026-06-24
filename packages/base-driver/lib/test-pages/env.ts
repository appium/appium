/** Environment variable that opts into deprecated built-in test pages on the Appium server. */
export const LEGACY_TEST_PAGES_ENV = 'APPIUM_ENABLE_LEGACY_TEST_PAGES';

const TRUTHY = new Set(['1', 'true', 'yes']);

/** @returns Whether built-in legacy test pages should be mounted on the Appium server. */
export function isLegacyTestPagesEnabled(): boolean {
  return TRUTHY.has(String(process.env[LEGACY_TEST_PAGES_ENV] ?? '').toLowerCase());
}
