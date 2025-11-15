import {argify} from '../../lib/util';
import _ from 'lodash';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

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
        _.omitBy(
          mikeOpts,
          (value, key) => _.includes(['port', 'host'], key) || (!_.isNumber(value) && !value),
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

