import {describe, it, snapshot} from 'node:test';
import type {TestContext} from 'node:test';

import {BIDI_COMMANDS} from '../../../lib/protocol/index.js';
import {resolveSourceSnapshotPath} from '../../helpers.js';

snapshot.setResolveSnapshotPath(resolveSourceSnapshotPath);

describe('BiDi commands', function () {
  describe('ensure protocol consistency', function () {
    it('should not change protocol between patch versions', function (t: TestContext) {
      // Update the snapshot (`--test-update-snapshots`) only when an intentional
      // bidi module/command/param change is made; review the diff before committing it.
      t.assert.snapshot(BIDI_COMMANDS);
    });
  });
});
