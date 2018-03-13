<?php
require_once("PHPUnit/Extensions/AppiumTestCase.php");
require_once("PHPUnit/Extensions/AppiumTestCase/Element.php");
require_once(__DIR__ . "/../helpers/Apps.php");
require_once(__DIR__ . "/../helpers/Caps.php");
require_once(__DIR__ . "/../helpers/Helpers.php");

define("CAPS", Caps::getAndroidCaps("", "", "Chrome"));


class AndroidCreateWebSession extends PHPUnit_Extensions_AppiumTestCase {
  public static $browsers = CAPS;

  public function testCreateWebSession()
  {
    // Navigate to google.com
    $this->url('https://www.google.com');

    // Test that it was successful by checking the document title
    $pageTitle = $this->title();
    $this->assertEquals($pageTitle, 'Google');
  }
}

?>