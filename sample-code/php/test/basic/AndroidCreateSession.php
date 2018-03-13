<?php
require_once("PHPUnit/Extensions/AppiumTestCase.php");
require_once("PHPUnit/Extensions/AppiumTestCase/Element.php");
require_once(__DIR__ . "/../helpers/Apps.php");
require_once(__DIR__ . "/../helpers/Caps.php");
require_once(__DIR__ . "/../helpers/Helpers.php");

define("APP", Apps::getApps()["androidApiDemos"]);
define("CAPS", Caps::getAndroidCaps(APP));


class AndroidCreateSession extends PHPUnit_Extensions_AppiumTestCase {
  public static $browsers = CAPS;

  public function testCreateSession()
  {
    // Check that we're running the ApiDemos app by checking package and activity
    $activity = $this->currentActivity();
    $pkg = $this->currentPackage();
    $this->assertEquals($activity, '.ApiDemos');
    $this->assertEquals($pkg, 'io.appium.android.apis');
  }
}

?>