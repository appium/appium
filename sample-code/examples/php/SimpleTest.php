<?php
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

    public function setUp()
    {
        parent::setUp();
    }

    protected function populate()
    {
        $elems = $this->byTagName('textField');
        foreach ($elems as $elem) {
            $randNum = rand(0, 10);
            $elem->value($randNum);
            $this->numValues[] = $randNum;
        }
    }

    public function testUiComputation()
    {
        $this->populate();
        $buttons = $this->byTagName('button');
        $buttons[0]->click();
        $texts = $this->byTagName('staticText');
        $this->assertEqual(int($texts[0]->text), array_sum($this->numValues));
    }
}
