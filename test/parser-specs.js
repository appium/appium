// transpile:mocha

import { getParser } from '../lib/cli/parser';
import { INSTALL_TYPES, DEFAULT_APPIUM_HOME } from '../lib/extension-config';
import chai from 'chai';

const should = chai.should();

const ALLOW_FIXTURE = 'test/fixtures/allow-feat.txt';
const DENY_FIXTURE = 'test/fixtures/deny-feat.txt';

describe('Main Parser', function () {
  let p = getParser(true);
  it('should accept only server and driver subcommands', function () {
    p.parseArgs([]);
    p.parseArgs(['server']);
    p.parseArgs(['driver', 'list']);
    (() => p.parseArgs(['foo'])).should.throw();
    (() => p.parseArgs(['foo --bar'])).should.throw();
  });
});

describe('Server Parser', function () {
  let p = getParser(true);
  it('should return an arg parser', function () {
    should.exist(p.parseArgs);
    p.parseArgs([]).should.have.property('port');
  });
  it('should default to the server subcommand', function () {
    p.parseArgs([]).subcommand.should.eql('server');
    p.parseArgs([]).should.eql(p.parseArgs(['server']));
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

describe('Driver Parser', function () {
  let p = getParser(true);
  it('should require a sub-subcommand', function () {
    (() => p.parseArgs(['driver'])).should.throw();
  });
  it('should not allow random sub-subcommands', function () {
    (() => p.parseArgs(['driver', 'foo'])).should.throw();
  });
  describe('list', function () {
    it('should allow an empty argument list', function () {
      const args = p.parseArgs(['driver', 'list']);
      args.subcommand.should.eql('driver');
      args.driverCommand.should.eql('list');
      args.showInstalled.should.eql(false);
      args.showUpdates.should.eql(false);
      args.json.should.eql(false);
      args.appiumHome.should.eql(DEFAULT_APPIUM_HOME);
    });
    it('should allow json format', function () {
      const args = p.parseArgs(['driver', 'list', '--json']);
      args.json.should.eql(true);
    });
    it('should allow custom appium home', function () {
      const args = p.parseArgs(['driver', 'list', '--home', '/foo/bar']);
      args.appiumHome.should.eql('/foo/bar');
    });
    it('should allow --installed', function () {
      const args = p.parseArgs(['driver', 'list', '--installed']);
      args.showInstalled.should.eql(true);
    });
    it('should allow --updates', function () {
      const args = p.parseArgs(['driver', 'list', '--updates']);
      args.showUpdates.should.eql(true);
    });
  });
  describe('install', function () {
    it('should not allow an empty argument list', function () {
      (() => p.parseArgs(['driver', 'install'])).should.throw();
    });
    it('should take a driver name to install', function () {
      const args = p.parseArgs(['driver', 'install', 'foobar']);
      args.subcommand.should.eql('driver');
      args.driverCommand.should.eql('install');
      args.driver.should.eql('foobar');
      should.not.exist(args.installType);
      args.appiumHome.should.eql(DEFAULT_APPIUM_HOME);
      args.json.should.eql(false);
    });
    it('should allow json format', function () {
      const args = p.parseArgs(['driver', 'install', 'foobar', '--json']);
      args.json.should.eql(true);
    });
    it('should allow custom appium home', function () {
      const args = p.parseArgs(['driver', 'install', 'foobar', '--home', '/foo/bar']);
      args.appiumHome.should.eql('/foo/bar');
    });
    it('should allow --source', function () {
      for (const source of INSTALL_TYPES) {
        const args = p.parseArgs(['driver', 'install', 'foobar', '--source', source]);
        args.installType.should.eql(source);
      }
    });
    it('should not allow unknown --source', function () {
      (() => p.parseArgs(['driver', 'install', 'fobar', '--source', 'blah'])).should.throw();
    });
  });
  describe('uninstall', function () {
    it('should not allow an empty argument list', function () {
      (() => p.parseArgs(['driver', 'uninstall'])).should.throw();
    });
    it('should take a driver name to uninstall', function () {
      const args = p.parseArgs(['driver', 'uninstall', 'foobar']);
      args.subcommand.should.eql('driver');
      args.driverCommand.should.eql('uninstall');
      args.driver.should.eql('foobar');
      args.appiumHome.should.eql(DEFAULT_APPIUM_HOME);
      args.json.should.eql(false);
    });
    it('should allow json format', function () {
      const args = p.parseArgs(['driver', 'uninstall', 'foobar', '--json']);
      args.json.should.eql(true);
    });
    it('should allow custom appium home', function () {
      const args = p.parseArgs(['driver', 'uninstall', 'foobar', '--home', '/foo/bar']);
      args.appiumHome.should.eql('/foo/bar');
    });
  });
  describe('update', function () {
    it('should not allow an empty argument list', function () {
      (() => p.parseArgs(['driver', 'update'])).should.throw();
    });
    it('should take a driver name to update', function () {
      const args = p.parseArgs(['driver', 'update', 'foobar']);
      args.subcommand.should.eql('driver');
      args.driverCommand.should.eql('update');
      args.driver.should.eql('foobar');
      args.appiumHome.should.eql(DEFAULT_APPIUM_HOME);
      args.json.should.eql(false);
    });
    it('should allow json format', function () {
      const args = p.parseArgs(['driver', 'update', 'foobar', '--json']);
      args.json.should.eql(true);
    });
    it('should allow custom appium home', function () {
      const args = p.parseArgs(['driver', 'update', 'foobar', '--home', '/foo/bar']);
      args.appiumHome.should.eql('/foo/bar');
    });
  });
});
