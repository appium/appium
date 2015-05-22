// transpile:mocha

import _ from 'lodash';
import getParser from '../lib/parser';
import chai from 'chai';

const should = chai.should();
const oldArgv = _.clone(process.env);

describe('Parser', () => {
  before(() => {
    process.argv = [];
  });
  after(() => {
    process.argv = oldArgv;
  });
  it('should return an arg parser', () => {
    let p = getParser();
    should.exist(p.parseArgs);
    p.parseArgs().should.have.property('port');
  });
  it('should keep the raw server flags array', () => {
    let p = getParser();
    should.exist(p.rawArgs);
  });
  it('should have help for every arg', () => {
    let p = getParser();
    for (let arg of p.rawArgs) {
      arg[1].should.have.property('help');
    }
  });
});
