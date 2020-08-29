// transpile:mocha

import getParser from '../lib/parser';
import chai from 'chai';

const should = chai.should();

const ALLOW_FIXTURE = 'test/fixtures/allow-feat.txt';
const DENY_FIXTURE = 'test/fixtures/deny-feat.txt';

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
    let args = p.parseArgs(['--default-capabilities', JSON.stringify(defaultCapabilities)]);
    args.defaultCapabilities.should.eql(defaultCapabilities);
  });
  it('should parse default capabilities correctly from a file', function () {
    let defaultCapabilities = {a: 'b'};
    let args = p.parseArgs(['--default-capabilities', 'test/fixtures/caps.json']);
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
  it('should parse --allow-insecure correctly', function () {
    p.parseArgs([]).allowInsecure.should.eql([]);
    p.parseArgs(['--allow-insecure', '']).allowInsecure.should.eql([]);
    p.parseArgs(['--allow-insecure', 'foo']).allowInsecure.should.eql(['foo']);
    p.parseArgs(['--allow-insecure', 'foo,bar']).allowInsecure.should.eql(['foo', 'bar']);
    p.parseArgs(['--allow-insecure', 'foo ,bar']).allowInsecure.should.eql(['foo', 'bar']);
  });
  it('should parse --deny-insecure correctly', function () {
    p.parseArgs([]).denyInsecure.should.eql([]);
    p.parseArgs(['--deny-insecure', '']).denyInsecure.should.eql([]);
    p.parseArgs(['--deny-insecure', 'foo']).denyInsecure.should.eql(['foo']);
    p.parseArgs(['--deny-insecure', 'foo,bar']).denyInsecure.should.eql(['foo', 'bar']);
    p.parseArgs(['--deny-insecure', 'foo ,bar']).denyInsecure.should.eql(['foo', 'bar']);
  });
  it('should parse --allow and --deny insecure from files', function () {
    const parsed = p.parseArgs([
      '--allow-insecure', ALLOW_FIXTURE, '--deny-insecure', DENY_FIXTURE
    ]);
    parsed.allowInsecure.should.eql(['feature1', 'feature2', 'feature3']);
    parsed.denyInsecure.should.eql(['nofeature1', 'nofeature2', 'nofeature3']);
  });
});
