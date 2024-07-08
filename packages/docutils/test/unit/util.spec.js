import {argify} from '../../lib/util';
import _ from 'lodash';

describe('argify', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

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
        _.omitBy(
          mikeOpts,
          (value, key) => _.includes(['port', 'host'], key) || (!_.isNumber(value) && !value),
        ),
      ),
      version,
    ];
    mikeArgs.should.eql([
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
