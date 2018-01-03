if (process.env.DEV) {
  exports.iosTestApp = "sample-code/apps/TestApp.zip";
  exports.androidApiDemos = "sample-code/apps/ApiDemos-debug.apk";
} else {
  // TODO: Change thes URL's to updated locations
  exports.iosTestApp = "http://appium.github.io/appium/assets/TestApp7.1.app.zip";
  exports.androidApiDemos = "http://appium.github.io/appium/assets/ApiDemos-debug.apk";
}
