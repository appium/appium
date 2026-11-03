import {fileURLToPath} from 'node:url';

export {getPort, pluginE2EHarness} from './harness.js';
export type {AppiumEnv, E2ESetupOpts} from './types.js';

// Handle smoke test flag
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv[2] === '--smoke-test') {
  process.exit(0);
}
