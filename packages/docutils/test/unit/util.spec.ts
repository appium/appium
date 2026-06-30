import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {argify} from '../../lib/utils';

chai.use(chaiAsPromised);
const {expect} = chai;

describe('argify', function () {
  it('should create args from params', function () {
    // deploy example
    const version = '2.0';
    const mikeOpts = {
      'config-file': '/path/to/yml',
      push: true,
      remote: 'origin',
      branch: 'gh-pages',
      'deploy-prefix': '2.0',
      message: 'docs: a thing',
      port: 8100,
      host: 'localhost',
    };
    const mikeArgs = [
      ...argify(
        Object.fromEntries(
          Object.entries(mikeOpts).filter(
            ([key, value]) => !['port', 'host'].includes(key) && (typeof value === 'number' || Boolean(value)),
          ),
        ),
      ),
      version,
    ];
    expect(mikeArgs).to.eql([
      '--config-file',
      '/path/to/yml',
      '--push',
      '--remote',
      'origin',
      '--branch',
      'gh-pages',
      '--deploy-prefix',
      '2.0',
      '--message',
      'docs: a thing',
      '2.0',
    ]);
  });
});
