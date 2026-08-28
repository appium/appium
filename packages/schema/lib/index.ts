import {fileURLToPath} from 'node:url';

export * from './appium-config-schema.js';

// Handle smoke test flag
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === '--smoke-test') {
  process.exit(0);
}
