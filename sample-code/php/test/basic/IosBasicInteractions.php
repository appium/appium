<?php
require_once("PHPUnit/Extensions/AppiumTestCase.php");
require_once("PHPUnit/Extensions/AppiumTestCase/Element.php");
require_once(__DIR__ . "/../helpers/Apps.php");
require_once(__DIR__ . "/../helpers/Caps.php");
require_once(__DIR__ . "/../helpers/Helpers.php");

define("APP", Apps::getApps()["iosTestApp"]);
define("CAPS", Caps::getIosCaps(APP, ".app.SearchInvoke"));


class IosBasicInteractions extends PHPUnit_Extensions_AppiumTestCase {
    public static $browsers = CAPS;

    public function testShouldSendKeysToSearchBoxAndCheckValue()
    {
        // Find TextField input element
        $textViewsEl = Helpers::elemBy($this, "accessibility id", "TextField1");

        // Check that it doesn't have a value
        $value = $textViewsEl->text();
        $this->assertEquals($value, "");

        // Send keys to that input
        $textViewsEl->value('Hello World!');

        // Check that the input has new value
        $value = $textViewsEl->text();
        $this->assertEquals(value, 'Hello World!');
    }

    public function testShouldClickButtonOpensAlert() 
    {
      // Find Button element and click on it
      $buttonElement = Helpers::elemBy($this, "accessibility id", "show alert");
      $buttonElement->click();
  
      // Wait for the alert to show up
      $alertTitleId = `Cool title`;
      $alertTitleElement = Helpers::elemBy($this, "accessibility id", "Cool title");
  
      // Check the text
      $alertTitle = $alertTitleElement->text();
      $this->assertEquals($alertTitle, "Cool title");
    }
}

?>