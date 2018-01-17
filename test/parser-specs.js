// transpile:mocha

import getParser from '../lib/parser';
import chai from 'chai';

const should = chai.should();

describe('Parser', function () {
  let p = getParser();
  p.debug = true; // throw instead of exit on error; pass as option instead?
  it('should return an arg parser', function () {
    should.exist(p.parseArgs);
    p.parseArgs([]).should.have.property('port');
  });
  it('should keep the raw server flags array', function () {
    should.exist(p.rawArgs);
  });
  it('should have help for every arg', function () {
    for (let arg of p.rawArgs) {
      arg[1].should.have.property('help');
    }
  });
  it('should throw an error with unknown argument', function () {
    (() => {p.parseArgs(['--apple']);}).should.throw();
  });
  it('should parse default capabilities correctly from a string', function () {
    let defaultCapabilities = {a: 'b'};
    let args = p.parseArgs(['--default-capabilities',
                            JSON.stringify(defaultCapabilities)]);
    args.defaultCapabilities.should.eql(defaultCapabilities);
  });
  it('should parse default capabilities correctly from a file', function () {
    let defaultCapabilities = {a: 'b'};
    let args = p.parseArgs(['--default-capabilities',
                           'test/fixtures/caps.json']);
    args.defaultCapabilities.should.eql(defaultCapabilities);
  });
  it('should throw an error with invalid arg to default capabilities', function () {
    (() => {p.parseArgs(['-dc', '42']);}).should.throw();
    (() => {p.parseArgs(['-dc', 'false']);}).should.throw();
    (() => {p.parseArgs(['-dc', 'null']);}).should.throw();
    (() => {p.parseArgs(['-dc', 'does/not/exist.json']);}).should.throw();
  });
  it('should parse args that are caps into default capabilities', function () {
    let defaultCapabilities = {localizableStringsDir: '/my/dir'};
    let args = p.parseArgs(['--localizable-strings-dir', '/my/dir']);
    args.defaultCapabilities.should.eql(defaultCapabilities);
  });
});
