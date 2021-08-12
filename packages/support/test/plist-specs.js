import chai from 'chai';
import path from 'path';
import { plist, tempDir, fs } from '../index.js';


chai.should();

const binaryPlistPath = path.join(__dirname, 'assets', 'sample_binary.plist');
const textPlistPath = path.join(__dirname, 'assets', 'sample_text.plist');

describe('plist', function () {
  it('should parse plist file as binary', async function () {
    let content = await plist.parsePlistFile(binaryPlistPath);
    content.should.have.property('com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework');
  });

  it(`should return an empty object if file doesn't exist and mustExist is set to false`, async function () {
    let mustExist = false;
    let content = await plist.parsePlistFile('doesntExist.plist', mustExist);
    content.should.be.an('object');
    content.should.be.empty;
  });

  it('should write plist file as binary', async function () {
    // create a temporary file, to which we will write
    let plistFile = path.resolve(await tempDir.openDir(), 'sample.plist');
    await fs.copyFile(binaryPlistPath, plistFile);

    // write some data
    let updatedFields = {
      'io.appium.test': true
    };
    await plist.updatePlistFile(plistFile, updatedFields, true);

    // make sure the data is there
    let content = await plist.parsePlistFile(plistFile);
    content.should.have.property('io.appium.test');
  });

  it('should read binary plist', async function () {
    const content = await fs.readFile(binaryPlistPath);
    const object = plist.parsePlist(content);
    object.should.have.property('com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework');
  });

  it('should read text plist', async function () {
    const content = await fs.readFile(textPlistPath);
    const object = plist.parsePlist(content);
    object.should.have.property('com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework');
  });
});
