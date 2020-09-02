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
    should.exist(p.parse_args);
    p.parse_args([]).should.have.property('port');
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
    (() => {p.parse_args(['--apple']);}).should.throw();
  });
  it('should parse default capabilities correctly from a string', function () {
    let defaultCapabilities = {a: 'b'};
    let args = p.parse_args(['--default-capabilities', JSON.stringify(defaultCapabilities)]);
    args.defaultCapabilities.should.eql(defaultCapabilities);
  });
  it('should parse default capabilities correctly from a file', function () {
    let defaultCapabilities = {a: 'b'};
    let args = p.parse_args(['--default-capabilities', 'test/fixtures/caps.json']);
    args.defaultCapabilities.should.eql(defaultCapabilities);
  });
  it('should throw an error with invalid arg to default capabilities', function () {
    (() => {p.parse_args(['-dc', '42']);}).should.throw();
    (() => {p.parse_args(['-dc', 'false']);}).should.throw();
    (() => {p.parse_args(['-dc', 'null']);}).should.throw();
    (() => {p.parse_args(['-dc', 'does/not/exist.json']);}).should.throw();
  });
  it('should parse args that are caps into default capabilities', function () {
    let defaultCapabilities = {localizableStringsDir: '/my/dir'};
    let args = p.parse_args(['--localizable-strings-dir', '/my/dir']);
    args.defaultCapabilities.should.eql(defaultCapabilities);
  });
  it('should parse --allow-insecure correctly', function () {
    p.parse_args([]).allowInsecure.should.eql([]);
    p.parse_args(['--allow-insecure', '']).allowInsecure.should.eql([]);
    p.parse_args(['--allow-insecure', 'foo']).allowInsecure.should.eql(['foo']);
    p.parse_args(['--allow-insecure', 'foo,bar']).allowInsecure.should.eql(['foo', 'bar']);
    p.parse_args(['--allow-insecure', 'foo ,bar']).allowInsecure.should.eql(['foo', 'bar']);
  });
  it('should parse --deny-insecure correctly', function () {
    p.parse_args([]).denyInsecure.should.eql([]);
    p.parse_args(['--deny-insecure', '']).denyInsecure.should.eql([]);
    p.parse_args(['--deny-insecure', 'foo']).denyInsecure.should.eql(['foo']);
    p.parse_args(['--deny-insecure', 'foo,bar']).denyInsecure.should.eql(['foo', 'bar']);
    p.parse_args(['--deny-insecure', 'foo ,bar']).denyInsecure.should.eql(['foo', 'bar']);
  });
  it('should parse --allow and --deny insecure from files', function () {
    const parsed = p.parse_args([
      '--allow-insecure', ALLOW_FIXTURE, '--deny-insecure', DENY_FIXTURE
    ]);
    parsed.allowInsecure.should.eql(['feature1', 'feature2', 'feature3']);
    parsed.denyInsecure.should.eql(['nofeature1', 'nofeature2', 'nofeature3']);
  });
});
