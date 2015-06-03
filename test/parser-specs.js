// transpile:mocha

import getParser from '../lib/parser';
import chai from 'chai';

const should = chai.should();

describe('Parser', () => {
  let p = getParser();
  it('should return an arg parser', () => {
    should.exist(p.parseArgs);
    p.parseArgs([]).should.have.property('port');
  });
  it('should keep the raw server flags array', () => {
    should.exist(p.rawArgs);
  });
  it('should have help for every arg', () => {
    for (let arg of p.rawArgs) {
      arg[1].should.have.property('help');
    }
  });
  it('should throw an error with unknown argument', () => {
    (() => {p.parseArgs(['--apple']);}).should.throw;
  });
  it('should parse default capabilities correctly', () => {
    let defaultCapabilities = {a: 'b'};
    let args = p.parseArgs(['--default-capabilities',
                            JSON.stringify(defaultCapabilities)]);
    args.defaultCapabilities.should.eql(defaultCapabilities);
  });
  it('should parse args that are caps into default capabilities', () => {
    let defaultCapabilities = {localizableStringsDir: '/my/dir'};
    let args = p.parseArgs(['--localizable-strings-dir', '/my/dir']);
    args.defaultCapabilities.should.eql(defaultCapabilities);
  });
});
