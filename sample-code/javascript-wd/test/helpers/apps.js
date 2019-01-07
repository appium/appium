import path from 'path';


const githubAssetBase = 'http://appium.github.io/appium/assets';
const localAssetBase = path.resolve(__dirname, '..', '..', '..', 'apps');

if (process.env.SAUCE_LABS) {
  // TODO: Change thes URL's to updated locations
  exports.iosTestApp = `${githubAssetBase}/TestApp7.1.app.zip`;
  exports.androidApiDemos = `${githubAssetBase}/ApiDemos-debug.apk`;
} else {
  exports.iosTestApp = path.resolve(localAssetBase, 'TestApp.app.zip');
  exports.androidApiDemos = path.resolve(localAssetBase, 'ApiDemos-debug.apk');
}
