import appiumConfig from '@appium/eslint-config-appium-ts';
import {defineConfig, globalIgnores} from 'eslint/config';

export default defineConfig([
  {
    name: 'Base Config',
    extends: [appiumConfig],
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
