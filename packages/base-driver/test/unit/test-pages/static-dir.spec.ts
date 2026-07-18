import {existsSync} from 'node:fs';
import path from 'node:path';
import {describe, it} from 'node:test';

import {expect} from 'chai';

import {TEST_FIXTURES_DIR} from '../../../lib/test-pages/static-dir';

describe('test page static directory', function () {
  it('should resolve the bundled test fixtures', function () {
    expect(TEST_FIXTURES_DIR).to.equal(
      path.resolve(__dirname, '..', '..', '..', '..', 'test-fixtures', 'static'),
    );
    expect(existsSync(TEST_FIXTURES_DIR)).to.be.true;
  });
});
