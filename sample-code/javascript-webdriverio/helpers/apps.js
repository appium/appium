if (process.env.DEV) {
  module.exports.iosTestApp = "http://appium.github.io/appium/assets/TestApp7.1.app.zip";
  module.exports.androidApiDemos = "http://appium.github.io/appium/assets/ApiDemos-debug.apk";
} else {
  module.exports.iosTestApp = "sample-code/apps/TestApp.app.zip";
  module.exports.androidApiDemos = "sample-code/apps/ApiDemos-debug.apk";
}
