<?php
require_once("PHPUnit/Extensions/AppiumTestCase.php");
require_once("PHPUnit/Extensions/AppiumTestCase/Element.php");
require_once(__DIR__ . "/../helpers/Apps.php");
require_once(__DIR__ . "/../helpers/Caps.php");
require_once(__DIR__ . "/../helpers/Helpers.php");

define("APP", Apps::getApps()["androidApiDemos"]);
define("CAPS", Caps::getAndroidCaps(APP, ".app.SearchInvoke"));


class AndroidBasicInteractions extends PHPUnit_Extensions_AppiumTestCase {
    public static $browsers = CAPS;

    public function testShouldSendKeysToSearchBoxAndCheckValue()
    {
        // Enter text in a search box
        $searchBoxElement = Helpers::elemBy($this, "id", "txt_query_prefill");
        $searchBoxElement->value("Hello world!");
    
        // Press on "onSearchRequestedButton"
        $onSearchRequestedButton = Helpers::elemBy($this, "id", "btn_start_search");
        $onSearchRequestedButton->click();
    
        // Check that the text matches the search term
        $searchText = Helpers::waitForElemBy($this, "id", "android:id/search_src_text");
        $this->assertEquals($searchText->text(), "Hello world!");
    }

    public function testShouldClickButtonOpensAlert() 
    {
        $this->startActivity(array(
            "appActivity" => ".app.AlertDialogSamples",
            "appPackage" => "io.appium.android.apis"
        ));
        $openDialogButtons = Helpers::waitForElemBy($this, "id", "io.appium.android.apis:id/two_buttons");
        $openDialogButtons->click();

        // Check that the dialog is there
        $alertElement = Helpers::waitForElemBy($this, "id", "android:id/alertTitle");
        $alertText = $alertElement->text();
        $this->assertEquals($alertText, "Lorem ipsum dolor sit aie consectetur adipiscing\nPlloaso mako nuto siwuf cakso dodtos anr koop.");
        $closeDialogButton = Helpers::waitForElemBy($this, "id", "android:id/button1");
    
        // Close the dialog
        $closeDialogButton->click();
    }
}
?>