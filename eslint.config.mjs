import tsConfig from '@appium/eslint-config-appium-ts';

export default [
  ...tsConfig,
  {
    ...tsConfig.find(({name}) => name === 'Test Files'),
    name: 'Test Support',
    files: [
      'packages/test-support/lib/**',
      'packages/driver-test-support/lib/**',
      'packages/plugin-test-support/lib/**',
    ],
  },
  {
    ignores: [
      '**/build-fixtures/**',
      'packages/appium/docs/**/assets/**',
      'packages/appium/docs/**/js/**',
      'packages/appium/sample-code/**',
    ],
  },
];

