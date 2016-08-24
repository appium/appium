// these are extra unit tests to ensure that appium is set up correctly for publishing

import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
var expect = chai.expect;

describe.skip('shrinkwrap checks', () => {
  it('shrinkwrap file should exist', async () => {
    require('../../npm-shrinkwrap.json');
  });

  it('shrinkwrap should not include fsevents', async () => {
    // fsevents is an optional dep that only works on Mac.
    // if it's in shrinkwrap, non-Mac hosts won't be able to install appium
    let shrinkwrap = require('../../npm-shrinkwrap.json');
    expect(shrinkwrap.dependencies, 'no shrinkwrap file found. run `npm shrinkwrap`').to.exist;
    _.values(shrinkwrap.dependencies).length.should.be.above(10);
    var message = "'fsevents' entry found in shrinkwrap. It causes problems " +
                  "on non-Mac systems. run `gulp fixShrinkwrap` and try again";
    expect(shrinkwrap.dependencies.fsevents, message).to.not.exist;
  });
});
