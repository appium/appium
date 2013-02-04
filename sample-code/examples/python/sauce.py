"""An example of Appium running on Sauce.

This test assumes SAUCE_USERNAME and SAUCE_ACCESS_KEY are environment variables
set to your Sauce Labs username and access key."""

import unittest
import os
from random import randint
from selenium import webdriver

SAUCE_USERNAME=os.environ.get('SAUCE_USERNAME')
SAUCE_ACCESS_KEY=os.environ.get('SAUCE_ACCESS_KEY')


class TestSequenceFunctions(unittest.TestCase):

    def setUp(self):
        # set up appium
        app = "https://raw.github.com/appium/appium/master/assets/TestApp.app.zip" 
        self.driver = webdriver.Remote(
            command_executor='http://%s:%s@ondemand.saucelabs.com:80/wd/hub' % (SAUCE_USERNAME, SAUCE_ACCESS_KEY),
            desired_capabilities={
                'browserName': 'iOS 6.0',
                'platform': 'Mac 10.8',
                'device': 'iPhone Simulator',
                'app': app
            })
        self._values = []

    def _populate(self):
        # populate text fields with two random number
        elems = self.driver.find_elements_by_tag_name('textField')
        for elem in elems:
            rndNum = randint(0, 10)
            elem.send_keys(rndNum)
            self._values.append(rndNum)

    def test_ui_computation(self):
        # populate text fields with values
        self._populate()
        # trigger computation by using the button
        buttons = self.driver.find_elements_by_tag_name("button")
        buttons[0].click()
        # is sum equal ?
        texts = self.driver.find_elements_by_tag_name("staticText")
        self.assertEqual(int(texts[0].text), self._values[0] + self._values[1])

    def tearDown(self):
        print("Link to your job: https://saucelabs.com/jobs/%s" % self.driver.session_id)
        self.driver.quit()


if __name__ == '__main__':
    if not (SAUCE_USERNAME and SAUCE_ACCESS_KEY):
        print "Make sure you have SAUCE_USERNAME and SAUCE_ACCESS_KEY set as environment variables."
    else:
        unittest.main()
