export {getPort, pluginE2EHarness} from './harness';
export type {AppiumEnv, E2ESetupOpts} from './types';

// Handle smoke test flag
if (require.main === module && process.argv[2] === '--smoke-test') {
  process.exit(0);
}
