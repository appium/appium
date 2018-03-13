<?php
require_once("PHPUnit/Extensions/AppiumTestCase.php");
require_once("PHPUnit/Extensions/AppiumTestCase/Element.php");
require_once(__DIR__ . "/../helpers/Apps.php");
require_once(__DIR__ . "/../helpers/Caps.php");
require_once(__DIR__ . "/../helpers/Helpers.php");

define("APP", Apps::getApps()["iosTestApp"]);
define("CAPS", Caps::getIosCaps(APP, ".app.SearchInvoke"));


class IosCreateSession extends PHPUnit_Extensions_AppiumTestCase {
  public static $browsers = CAPS;

  public function testCreateSession()
  {
    // Check that the XCUIElementTypeApplication was what we expect it to be
    $applicationElement = Helpers::elemBy($this, 'class name', 'XCUIElementTypeApplication');
    $applicationName = $applicationElement->attribute('name');
    $this->assertEquals($applicationName, 'TestApp');
  }

}

?>