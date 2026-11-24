import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {parseConfig} from '../../lib/config.js';

describe('parseConfig', () => {
  it('accepts valid options', () => {
    const config = {sourceRoot: 'src', tsconfig: 't.json', entryPointScopes: ['@a'], typeOnlyCycles: 'ignore'};
    assert.deepEqual(parseConfig(config, 'config.json'), config);
    assert.deepEqual(parseConfig({}, 'config.json'), {});
  });

  it('rejects unknown options and bad values', () => {
    assert.throws(() => parseConfig({sourceroot: 'src'}, 'config.json'), /unknown option 'sourceroot'/);
    assert.throws(() => parseConfig({sourceRoot: 1}, 'config.json'), /'sourceRoot' must be a string/);
    assert.throws(() => parseConfig({entryPointScopes: '@a'}, 'config.json'), /array of strings/);
    assert.throws(() => parseConfig({typeOnlyCycles: 'warn'}, 'config.json'), /'error' or 'ignore'/);
    assert.throws(() => parseConfig([], 'config.json'), /expected a JSON object/);
  });
});
