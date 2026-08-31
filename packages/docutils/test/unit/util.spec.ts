import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {argify} from '../../lib/utils/index.js';

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
    assert.deepStrictEqual(mikeArgs, [
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
