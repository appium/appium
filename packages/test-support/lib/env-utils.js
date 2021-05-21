import _ from 'lodash';

function stubEnv () {
  let envBackup;
  beforeEach(function beforeEach () {
    envBackup = process.env; process.env = _.cloneDeep(process.env);
  });
  afterEach(function afterEach () {
    process.env = envBackup;
  });
}

export { stubEnv };
