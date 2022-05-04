/**
 * Creates Mocha "before each" and "after each" hooks to restore `process.env` after every test.
 */
function stubEnv() {
  /** @type {NodeJS.ProcessEnv} */
  let envBackup;
  beforeEach(function beforeEach() {
    envBackup = process.env;
    process.env = {...process.env};
  });
  afterEach(function afterEach() {
    process.env = envBackup;
  });
}

export {stubEnv};
