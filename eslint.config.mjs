import appiumConfig from '@appium/eslint-config-appium-ts';
import {defineConfig, globalIgnores} from 'eslint/config';

// Create a modified config subset for test support files:
// Extract the test file related configs (Mocha plugin and custom rules),
// then override their 'files' property
const testFileConfigItems = [appiumConfig[8], appiumConfig[9]];
const testSupportFiles = [
  'packages/test-support/lib/**',
  'packages/driver-test-support/lib/**',
  'packages/plugin-test-support/lib/**',
];
const testSupportConfig = testFileConfigItems.map((item) => ({...item, files: testSupportFiles}));

export default defineConfig([
  {
    name: 'Base Config',
    extends: [appiumConfig],
  },
  {
    name: 'Test Support',
    extends: [testSupportConfig],
  },
  {
    name: 'Consistent type-only imports (all packages)',
    files: ['**/*.{ts,tsx,mtsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports', prefer: 'type-imports' },
      ],
    },
  },
  globalIgnores([
    '**/build-fixtures/**',
    'packages/appium/docs/**/assets/**',
    'packages/appium/docs/**/js/**',
    'packages/appium/sample-code/**',
  ]),
]);
