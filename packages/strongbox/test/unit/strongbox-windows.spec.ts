import assert from 'node:assert/strict';
import path from 'node:path';
import {before, describe, it, mock} from 'node:test';

import type {Strongbox as TStrongbox, StrongboxOpts} from '../../lib/index.js';

describe('Strongbox windows container paths', function () {
  let strongbox: (name: string, opts?: Partial<StrongboxOpts>) => TStrongbox;

  before(async function () {
    // this file only: Strongbox should see windows paths, even on linux
    mock.module('node:path', {defaultExport: path.win32});
    ({strongbox} = await import('../../lib/index.js'));
  });

  it('should slugify a windows drive path without dropping the root', function () {
    const container = 'C:\\some dir\\another one';
    const {container: actual} = strongbox('test', {container});

    assert.ok(path.win32.isAbsolute(actual));
    assert.strictEqual(path.win32.parse(actual).root, path.win32.parse(container).root);
    assert.strictEqual(actual, 'C:\\some-dir\\another-one');
  });

  it('should slugify a UNC path without dropping the share', function () {
    const container = '\\\\server\\share\\some dir\\another one';
    const {container: actual} = strongbox('test', {container});

    assert.ok(path.win32.isAbsolute(actual));
    assert.strictEqual(path.win32.parse(actual).root, path.win32.parse(container).root);
    assert.strictEqual(actual, '\\\\server\\share\\some-dir\\another-one');
  });
});
