<?php
// To run this test, install Sausage (see http://github.com/jlipps/sausage-bun
// to get the curl one-liner to run in this directory), then run:
//     vendor/bin/phpunit SauceTest.php

require_once "vendor/autoload.php";
define("APP_URL", "http://appium.s3.amazonaws.com/TestApp6.0.app.zip");

class SauceTest extends Sauce\Sausage\WebDriverTestCase
{
    protected $numValues = array();

    public static $browsers = array(
        array(
            'browserName' => '',
            'seleniumServerRequestsTimeout' => 240,
            'desiredCapabilities' => array(
                'platform' => 'Mac 10.8',
                'device' => 'iPhone Simulator',
                'app' => APP_URL,
                'version' => '6.1',
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
