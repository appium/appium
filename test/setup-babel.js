// This configures @babel/register to look for a babel config in parent dir(s) of
// wherever the tests are run.  This is required if running tests via `mocha` in a package dir
// instead of the monorepo root. This does not affect `gulp-mocha`, since it has its own `.babelrc`.
// This file is required _in addition to_ the monorepo root's `test/setup.js`.

require('@babel/register')({rootMode: 'upward'});
