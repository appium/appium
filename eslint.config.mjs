import globals from 'globals';
import tsConfig from '@appium/eslint-config-appium-ts';

tsConfig.find(({name}) => name === 'Test Overrides').files.push(
  'packages/test-support/lib/**',
  'packages/driver-test-support/lib/**',
  'packages/plugin-test-support/lib/**',
);

export default [
  ...tsConfig,
  {
    files: ['packages/support/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
        BigInt: 'readonly',
      },
    }
  },
  {
    files: ['./packages/*/test/**/*.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-restricted-properties': [
        'error',
        {
          'object': 'sinon',
          'property': 'spy',
          'message': 'Use `sandbox = sinon.createSandbox()` and `sandbox.spy()` instead. Don\'t forget to call `sandbox.restore()` in `afterEach`'
        },
        {
          'object': 'sinon',
          'property': 'stub',
          'message': 'Use `sandbox = sinon.createSandbox()` and `sandbox.stub()` instead. Don\'t forget to call `sandbox.restore()` in `afterEach`'
        },
        {
          'object': 'sinon',
          'property': 'mock',
          'message': 'Use `sandbox = sinon.createSandbox()` and `sandbox.mock()` instead. Don\'t forget to call `sandbox.restore()` in `afterEach`'
        }
      ]
    }
  },
  {
    ignores: [
      'examples/javascript-wd',
      'sample-code',
      '**/build-fixtures/**',
      'packages/appium/docs/**/assets/**',
      'packages/appium/docs/**/js/**',
      'packages/appium/sample-code/**',
    ],
  },
];

