// transpile:mocha

import { pkgRoot, configureBinaryLog } from '../lib/utils';
import { fs } from 'appium-support';
import chai from 'chai';
import path from 'path';
import { Doctor } from '../lib/doctor';

chai.should();

describe('utils', function () {

  it('fs.readFile', async function () {
    (await fs.readFile(path.resolve(pkgRoot, 'test', 'fixtures',
      'wow.txt'), 'utf8')).should.include('WOW');
  });

  it('fs.exists', async function () {
    (await fs.exists(path.resolve(pkgRoot, 'test', 'fixtures',
      'wow.txt'))).should.be.ok;
    (await fs.exists(path.resolve(pkgRoot, 'test', 'fixtures',
      'notwow.txt'))).should.not.be.ok;
  });

  it('Should handle logs through onLogMessage callback', function () {
    function onLogMessage (level, prefix, msg) {
      `${level} ${prefix} ${msg}`.should.include('AppiumDoctor');
    }

    configureBinaryLog({ onLogMessage });
    let doctor = new Doctor();
    doctor.run();
  });

});
