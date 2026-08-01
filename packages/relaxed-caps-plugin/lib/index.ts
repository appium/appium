import {fileURLToPath} from 'node:url';

export {RelaxedCapsPlugin} from './plugin.js';

// Handle smoke test flag
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv[2] === '--smoke-test') {
  process.exit(0);
}
