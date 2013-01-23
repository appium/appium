<?php
// To run this test, install Sausage (see http://github.com/jlipps/sausage-bun
// to get the curl one-liner to run in this directory), then run:
//     vendor/bin/phpunit SimpleTest.php
// NOTE: this test is currently broken, waiting on this fix:
// https://github.com/giorgiosironi/phpunit-selenium/pull/18

require_once "vendor/autoload.php";

class SimpleTest extends Sauce\Sausage\WebDriverTestCase
{
    protected $numValues = array();

    public static $browsers = array(
        array(
            'local' => true,
            'port' => 4723,
            'browserName' => 'iOS',
            'desiredCapabilities' => array(
                'version' => '6.0',
                'platform' => 'Mac'
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
        sleep(10);
    }
}
