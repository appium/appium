import chai from 'chai';
import path from 'path';
import chaiAsPromised from 'chai-as-promised';
import { BaseDriver } from '../../..';
import { CUSTOM_STRATEGY } from '../../../lib/basedriver/commands/find';

chai.use(chaiAsPromised);

const CUSTOM_FIND_MODULE = path.resolve(__dirname, '..', '..', '..', '..',
  'test', 'basedriver', 'fixtures', 'custom-element-finder');
const BAD_CUSTOM_FIND_MODULE = path.resolve(__dirname, '..', '..', '..', '..',
  'test', 'basedriver', 'fixtures', 'custom-element-finder-bad');

describe('custom element finding plugins', function () {
  // happys
  it('should find a single element using a custom finder', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.eql('bar');
  });
  it('should not require selector prefix if only one find plugin is registered', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'foo').should.eventually.eql('bar');
  });
  it('should find multiple elements using a custom finder', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElements(CUSTOM_STRATEGY, 'f:foos').should.eventually.eql(['baz1', 'baz2']);
  });
  it('should give a hint to the plugin about whether multiple are requested', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:foos').should.eventually.eql('bar1');
  });
  it('should be able to use multiple find modules', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE, g: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.eql('bar');
    await d.findElement(CUSTOM_STRATEGY, 'g:foo').should.eventually.eql('bar');
  });

  // errors
  it('should throw an error if customFindModules is not set', async function () {
    const d = new BaseDriver();
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.be.rejectedWith(/customFindModules/);
  });
  it('should throw an error if customFindModules is the wrong shape', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = CUSTOM_FIND_MODULE;
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.be.rejectedWith(/customFindModules/);
  });
  it('should throw an error if customFindModules is size > 1 and no selector prefix is used', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE, g: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'foo').should.eventually.be.rejectedWith(/multiple element finding/i);
  });
  it('should throw an error in attempt to use unregistered plugin', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE, g: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'z:foo').should.eventually.be.rejectedWith(/was not registered/);
  });
  it('should throw an error if plugin cannot be loaded', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: './foo.js'};
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.be.rejectedWith(/could not load/i);
  });
  it('should throw an error if plugin is not the right shape', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: BAD_CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:foo').should.eventually.be.rejectedWith(/constructed correctly/i);
  });
  it('should pass on an error thrown by the finder itself', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:error').should.eventually.be.rejectedWith(/plugin error/i);
  });
  it('should throw no such element error if element not found', async function () {
    const d = new BaseDriver();
    d.opts.customFindModules = {f: CUSTOM_FIND_MODULE};
    await d.findElement(CUSTOM_STRATEGY, 'f:nope').should.eventually.be.rejectedWith(/could not be located/);
  });
});