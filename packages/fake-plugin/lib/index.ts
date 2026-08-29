import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export {FakePlugin} from './plugin.js';

// Handle smoke test flag. realpath() both sides so this still matches when invoked through a
// bin symlink, since `import.meta.url` resolves symlinks but `process.argv[1]` does not.
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === realpathSync(process.argv[1]) &&
  process.argv[2] === '--smoke-test'
) {
  process.exit(0);
}
