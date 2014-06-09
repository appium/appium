if (process.env.DEV) {
  exports.iosTestApp = "sample-code/apps/TestApp/build/Release-iphonesimulator/TestApp.app";
  exports.iosWebviewApp = "sample-code/apps/WebViewApp/build/Release-iphonesimulator/WebViewApp.app";
  exports.iosUICatalogApp = "sample-code/apps/UICatalog/build/Release-iphonesimulator/UICatalog.app";
  exports.androidApiDemos = "sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk";
  exports.selendroidTestApp = "sample-code/apps/selendroid-test-app.apk";
} else {
  exports.iosTestApp = "http://appium.github.io/appium/assets/TestApp7.1.app.zip";
  exports.iosWebviewApp = "http://appium.github.io/appium/assets/WebViewApp7.1.app.zip";
  exports.iosUICatalogApp = "http://appium.github.io/appium/assets/UICatalog7.1.app.zip";
  exports.androidApiDemos = "http://appium.github.io/appium/assets/ApiDemos-debug.apk";
  exports.selendroidTestApp = "http://appium.github.io/appium/assets/selendroid-test-app-0.10.0.apk";

  exports.iosWebviewAppLocal = "http://localhost:3000/WebViewApp7.1.app.zip";
  exports.androidApiDemosLocal = "http://localhost:3000/ApiDemos-debug.apk";
}
