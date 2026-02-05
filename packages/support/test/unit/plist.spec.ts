import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as chai from 'chai';
import path from 'node:path';
import {plist, tempDir, fs} from '../../lib';

const binaryPlistPath = path.join(__dirname, 'assets', 'sample_binary.plist');
const textPlistPath = path.join(__dirname, 'assets', 'sample_text.plist');

describe('plist', function () {
  before(function () {
    use(chaiAsPromised);
    chai.should();
  });

  it('should parse plist file as binary', async function () {
    const content = await plist.parsePlistFile(binaryPlistPath);
    expect(content).to.have.property(
      'com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework'
    );
  });

  it(`should return an empty object if file doesn't exist and mustExist is set to false`, async function () {
    const mustExist = false;
    const content = await plist.parsePlistFile('doesntExist.plist', mustExist);
    expect(content).to.be.an('object');
    expect(content).to.be.empty;
  });

  it('should write plist file as binary', async function () {
    const plistFile = path.resolve(await tempDir.openDir(), 'sample.plist');
    await fs.copyFile(binaryPlistPath, plistFile);

    const updatedFields = {
      'io.appium.test': true,
    };
    await plist.updatePlistFile(plistFile, updatedFields, true);

    const content = await plist.parsePlistFile(plistFile);
    expect(content).to.have.property('io.appium.test');
  });

  it('should read binary plist', async function () {
    const content = await fs.readFile(binaryPlistPath);
    const object = plist.parsePlist(content);
    expect(object).to.have.property(
      'com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework'
    );
  });

  it('should read text plist', async function () {
    const content = await fs.readFile(textPlistPath);
    const object = plist.parsePlist(content);
    expect(object).to.have.property(
      'com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework'
    );
  });
});
