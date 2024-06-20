import { Log } from '../../lib/log';
import { waitForCondition } from 'asyncbox';

describe('display', function () {
  let log;

  describe('explicitly set new log level display to empty string', function () {
    let actual;

    beforeEach(function () {
      actual = '';
      log = new Log();
      log.write = (msg) => {
        actual += msg;
      };
    });

    it('explicitly set new log level display to empty string', async function () {
      log.addLevel('explicitNoLevelDisplayed', 20000, {}, '');
      log.explicitNoLevelDisplayed('1', '2');
      await waitForCondition(() => actual.trim() === '1 2', {waitMs: 1000, intervalMs: 50});

      actual = '';
      log.explicitNoLevelDisplayed('', '1');
      await waitForCondition(() => actual.trim() === '1', {waitMs: 1000, intervalMs: 50});
    });

    it('explicitly set new log level display to 0', async function () {
      log.addLevel('explicitNoLevelDisplayed', 20000, {}, 0);
      log.explicitNoLevelDisplayed('', '1');
      await waitForCondition(() => actual.trim() === '0 1', {waitMs: 1000, intervalMs: 50});
    });
  });
});
