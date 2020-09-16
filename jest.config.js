module.exports = {
  testMatch: [
    '**/test/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/sample-code/'
  ],
  collectCoverageFrom: [
    'packages/**/src/**/*.js'
  ],
  coverageDirectory: './coverage/',
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 96,
      functions: 98,
      lines: 99,
      statements: 99
    }
  },
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    'node_modules/'
  ]
};
