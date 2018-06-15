<?php

define("IOS_TEST_APP", __DIR__.'/../../../apps/TestApp.app.zip');
define("ANDROID_API_DEMOS", __DIR__.'/../../../apps/ApiDemos-debug.apk');

class Apps {
  public static function getApps () {
    if (getenv("SAUCE_LABS", true)) {
      return array(
        "iosTestApp" => "http://appium.github.io/appium/assets/TestApp7.1.app.zip",
        "androidApiDemos" => "http://appium.github.io/appium/assets/ApiDemos-debug.apk",
      );
    } else {
      return array(
        "iosTestApp" => IOS_TEST_APP,
        "androidApiDemos" => ANDROID_API_DEMOS,
      );
    }
  }
}

?>