'use strict';

/**
 * Mocha will load this file to configure the environment to use Chai as the
 * assertion library. Since Chai is a singleton, we can run into problems when
 * running files individually, if we have not carefully configured Chai in every
 * single test file. This file means less boilerplate and less random test
 * failures when running single test files.
 *
 * For simplicity, this file is _not_ transpiled.  If it were, Mocha would need
 * to load different versions of this file depending on the test context (are we
 * running tests against the distfiles, or the source files?).
 *
 */

// This configures @babel/register to look for a babel config in parent dir(s) of
// wherever the tests are run.  This is required if running tests via `mocha` in a package dir
// instead of the monorepo root. This does not affect `gulp-mocha`, since it has its own `.babelrc`.
// This file is required _in addition to_ the monorepo root's `test/setup.js`.

require('@babel/register')({rootMode: 'upward'});

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');

// The `chai` global is set if a test needs something special.
// Most tests won't need this.
global.chai = chai.use(chaiAsPromised).use(sinonChai);

// `should()` is only necessary when working with some `null` or `undefined` values.
global.should = chai.should();
