<?php

$host = getenv("APPIUM_HOST", true) || "localhost";
if (getenv("SAUCE_LABS", true)) {
  $host = "ondemand.saucelabs.com";
}

// Define the port
$port = 4723;
if (isset($_ENV["APPIUM_PORT"])) {
  $port = getenv("APPIUM_PORT");
} else if (isset($_ENV["SAUCE_LABS"]) && getenv("SAUCE_LABS", true)) {
  $port = 80;
}

// Define if is local
$isLocal = false;
if (isset($_ENV["SAUCE_LABS"])) {
  $isLocal = getenv("SAUCE_LABS", true);
}

// Get default android platform version
$androidPlatformVersion = "";
$androidDeviceName = "My Android Device";
if (isset($_ENV["SAUCE_LABS"])) {
  $androidPlatformVersion = getenv("ANDROID_PLATFORM_VERSION", true);
  $androidDeviceName = "Android GoogleAPI Emulator";
}


define('PORT', $port);
define('IS_LOCAL', $isLocal);
define('ANDROID_PLATFORM_VERSION', $androidPlatformVersion);
define('ANDROID_DEVICE_NAME', $androidDeviceName);

class Caps {
  public static function getIosCaps($app, $browserName="") {
    return array(
      array(
        "local" => IS_LOCAL,
        "port" => PORT,
        "browserName" => $browserName,
        "desiredCapabilities" => array(
          "platformName" => "iOS",
          "automationName" => "XCUITest",
          "platformVersion" => getenv("IOS_PLATFORM_VERSION", true) ? getenv("IOS_PLATFORM_VERSION") : "11.1",
          "deviceName" => getenv("IOS_DEVICE_NAME", true) ? getenv("IOS_DEVICE_NAME") : "iPhone 6s",
          "app" => $app
        )
      )
    );
  }

  public static function getAndroidCaps($app, $appActivity="", $browserName="") {
    return array(
      array(
        "local" => IS_LOCAL,
        "port" => PORT,
        "browserName" => $browserName,
        "desiredCapabilities" => array(
          "platformName" => "Android",
          "automationName" => "UIAutomator2",
          "platformVersion" => ANDROID_PLATFORM_VERSION,
          "deviceName" => ANDROID_DEVICE_NAME,
          "app" => $app,
          "appActivity" => $appActivity,
        )
      )
    );
  }
}

?>