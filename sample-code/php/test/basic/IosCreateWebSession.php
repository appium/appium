<?php
require_once("PHPUnit/Extensions/AppiumTestCase.php");
require_once("PHPUnit/Extensions/AppiumTestCase/Element.php");
require_once(__DIR__ . "/../helpers/Apps.php");
require_once(__DIR__ . "/../helpers/Caps.php");
require_once(__DIR__ . "/../helpers/Helpers.php");

define("APP", Apps::getApps()["iosTestApp"]);
define("CAPS", Caps::getIosCaps("", "Safari"));


class IosCreateWebSession extends PHPUnit_Extensions_AppiumTestCase {
  public static $browsers = CAPS;

  public function testShouldCreateAndDestroySafariSession()
  {
    // Navigate to google.com
    $this->url('https://www.google.com');

    // Test that it was successful by checking the document title
    $pageTitle = $this->title();
    $this->assertEquals($pageTitle, 'Google');
  }

}

?>