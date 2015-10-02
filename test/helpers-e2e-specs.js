import chai from 'chai';
import path from 'path';
import chaiAsPromised from 'chai-as-promised';
import { fs } from 'appium-support';
import h from '../lib/helpers';

chai.use(chaiAsPromised);

function getFixture (file) {
  return path.resolve(__dirname, '..', '..', 'test', 'fixtures', file);
}

describe('app download and configuration', () => {
  describe('configureApp', () => {
    it('should get the path for a local .app', async () => {
      let newAppPath = await h.configureApp(getFixture('FakeIOSApp.app'), '.app');
      newAppPath.should.contain('FakeIOSApp.app');
      let contents = await fs.readFile(newAppPath, 'utf8');
      contents.should.eql('this is not really an app\n');
    });
    it('should get the path for a local .apk', async () => {
    });
    it('should unzip and get the path for a local .app.zip', async () => {
      let newAppPath = await h.configureApp(getFixture('FakeIOSApp.app.zip'), '.app');
      newAppPath.should.contain('FakeIOSApp.app');
      let contents = await fs.readFile(newAppPath, 'utf8');
      contents.should.eql('this is not really an app\n');
    });
    it('should unzip and get the path for a local .ipa', async () => {
      let newAppPath = await h.configureApp(getFixture('FakeIOSApp.ipa'), '.app');
      newAppPath.should.contain('FakeIOSApp.app');
      let contents = await fs.readFile(newAppPath, 'utf8');
      contents.should.eql('this is not really an app\n');
    });
    it('should download an app from the web', async () => {
      // TODO just spin up a local webserver to serve fixtures from, that way
      // there's no dependency on the internet
    });
    // TODO test failure cases like:
    // - bad zip
    // - non-matching extension
    // - zip didn't contain app with extension
    // - could not download
  });
});
