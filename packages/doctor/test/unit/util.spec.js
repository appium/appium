import {configureBinaryLog, resetLog} from '../../lib/utils';
import {fs} from '@appium/support';
import path from 'path';
import {Doctor} from '../../lib/doctor';

describe('utils', function () {
  it('fs.readFile', async function () {
    (
      await fs.readFile(path.resolve(__dirname, 'fixtures', 'wow.txt'), 'utf8')
    ).should.include('WOW');
  });

  it('fs.exists', async function () {
    (await fs.exists(path.resolve(__dirname, 'fixtures', 'wow.txt'))).should.be
      .ok;
    (await fs.exists(path.resolve(__dirname, 'fixtures', 'notwow.txt'))).should
      .not.be.ok;
  });

  it('Should handle logs through onLogMessage callback', async function () {
    function onLogMessage(level, prefix, msg) {
      `${level} ${prefix} ${msg}`.should.include('AppiumDoctor');
    }

    configureBinaryLog({onLogMessage});
    let doctor = new Doctor();
    try {
      await doctor.run();
    } finally {
      resetLog();
    }
  });
});
