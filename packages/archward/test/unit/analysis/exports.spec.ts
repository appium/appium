import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {isExportedSubpath} from '../../../lib/analysis/exports.js';

describe('isExportedSubpath', () => {
  const exportsField = {
    '.': './index.js',
    './oxlint': {types: './oxlint.d.ts', import: './oxlint.js'},
    './features/*': './src/features/*.js',
    './features/internal/*': null,
    './hidden': null,
  };

  it('allows listed subpaths', () => {
    assert.ok(isExportedSubpath(exportsField, './oxlint'));
    assert.ok(isExportedSubpath(exportsField, './features/a'));
  });

  it('rejects unlisted, blocked and non-exported subpaths', () => {
    assert.ok(!isExportedSubpath(exportsField, './lib/fs.js'));
    assert.ok(!isExportedSubpath(exportsField, './hidden'));
    assert.ok(!isExportedSubpath(exportsField, './features/internal/x'));
  });

  it('picks the most specific pattern, like Node', () => {
    assert.ok(!isExportedSubpath({'./features/*': './src/*.js', './features/*.js': null}, './features/private.js'));
    assert.ok(!isExportedSubpath({'./features/*.js': null, './features/*': './src/*.js'}, './features/private.js'));
    assert.ok(isExportedSubpath({'./features/*': null, './features/*.js': './src/*.js'}, './features/public.js'));
  });

  it('treats packages without a subpath map as having only a root entry point', () => {
    assert.ok(!isExportedSubpath(undefined, './oxlint'));
    assert.ok(!isExportedSubpath('./index.js', './oxlint'));
    assert.ok(!isExportedSubpath({import: './index.js', default: './index.cjs'}, './oxlint'));
  });
});
