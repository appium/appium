export * from './appium-config-schema.js';

// Handle the smoke test flag only when invoked directly.
if (import.meta.main && process.argv[2] === '--smoke-test') {
  process.exit(0);
}
