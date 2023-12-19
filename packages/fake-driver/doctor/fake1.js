/* eslint-disable @typescript-eslint/no-var-requires */
const {EnvVarAndPathCheck} = require('./common');

const fakeCheck1 = new EnvVarAndPathCheck('FAKE1');

module.exports = {fakeCheck1};
