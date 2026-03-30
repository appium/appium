export {RelaxedCapsPlugin} from './plugin';

// Handle smoke test flag
if (require.main === module && process.argv[2] === '--smoke-test') {
  process.exit(0);
}
