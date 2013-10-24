<?php
// To run this test, install Sausage (see http://github.com/jlipps/sausage-bun
// to get the curl one-liner to run in this directory), then run:
//     vendor/bin/phpunit SimpleTest.php

require_once "vendor/autoload.php";
define("APP_PATH", realpath(dirname(__FILE__).'/../../apps/TestApp/build/Release-iphonesimulator/TestApp.app'));
if (!APP_PATH) {
    die("App did not exist!");
}


class SimpleTest extends Sauce\Sausage\WebDriverTestCase
{
    protected $numValues = array();

    public static $browsers = array(
        array(
            'local' => true,
            'port' => 4723,
            'browserName' => '',
            'desiredCapabilities' => array(
                'device' => 'iPhone Simulator',
                'version' => '6.0',
                'platform' => 'Mac',
                'app' => APP_PATH
            )
        )
    );

    public function elemsByTag($tag)
    {
        return $this->elements($this->using('tag name')->value($tag));
    }

    protected function populate()
    {
        $elems = $this->elemsByTag('textField');
        foreach ($elems as $elem) {
            $randNum = rand(0, 10);
            $elem->value($randNum);
            $this->numValues[] = $randNum;
        }
    }

    public function testUiComputation()
    {
        $this->populate();
        $buttons = $this->elemsByTag('button');
        $buttons[0]->click();
        $texts = $this->elemsByTag('staticText');
        $this->assertEquals(array_sum($this->numValues), (int)($texts[0]->text()));
    }
}
