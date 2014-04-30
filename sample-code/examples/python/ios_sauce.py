"""An example of Appium running on Sauce.

This test assumes SAUCE_USERNAME and SAUCE_ACCESS_KEY are environment variables
set to your Sauce Labs username and access key."""

import unittest
import os
import httplib
import base64
from random import randint
from appium import webdriver
try:
    import json
except ImportError:
    import simplejson as json

SAUCE_USERNAME=os.environ.get('SAUCE_USERNAME')
SAUCE_ACCESS_KEY=os.environ.get('SAUCE_ACCESS_KEY')
base64string = base64.encodestring('%s:%s' % (SAUCE_USERNAME, SAUCE_ACCESS_KEY))[:-1]

class SimpleIOSSauceTests(unittest.TestCase):

    def setUp(self):
        # set up appium
        app = "http://appium.s3.amazonaws.com/TestApp6.0.app.zip"
        self.driver = webdriver.Remote(
            command_executor='http://%s:%s@ondemand.saucelabs.com:80/wd/hub' % (SAUCE_USERNAME, SAUCE_ACCESS_KEY),
            desired_capabilities={
                'browserName': '',
                'platformName': 'Android',
                'deviceName': 'iPhone Simulator',
                'platformVersion': '6.1',
                'app': app,
                'name': 'Appium Python iOS Test'
            })

    def tearDown(self):
        print("Link to your job: https://saucelabs.com/jobs/%s" % self.driver.session_id)
        self.driver.quit()

    def _set_test_status(self, jobid, passed=True):
        # Report the status of your test to Sauce
        body_content = json.dumps({"passed": passed})
        connection = httplib.HTTPConnection("saucelabs.com")
        connection.request('PUT', '/rest/v1/%s/jobs/%s' % (SAUCE_USERNAME, jobid),
                           body_content,
                           headers={"Authorization": "Basic %s" % base64string})
        result = connection.getresponse()
        return result.status == 200

    def _populate(self):
        # populate text fields with two random numbers
        els = self.driver.find_elements_by_ios_uiautomation('elements()')

        self._sum = 0
        for i in range(2):
            rnd = randint(0, 10)
            els[i].send_keys(rnd)
            self._sum += rnd

    def test_ui_computation(self):
        # populate text fields with values
        self._populate()

        # trigger computation by using the button
        self.driver.find_element_by_accessibility_id('ComputeSumButton').click()

        # is sum equal ?
        # sauce does not handle class name, so get fourth element
        # sum = self.driver.find_elements_by_class_name("UIAStaticText")[0].text
        sum = self.driver.find_element_by_ios_uiautomation('elements()[3]').text
        try:
            self.assertEqual(int(sum), self._sum)
            self._set_test_status(self.driver.session_id, True)
        except:
            self._set_test_status(self.driver.session_id, False)


if __name__ == '__main__':
    if not (SAUCE_USERNAME and SAUCE_ACCESS_KEY):
        print "Make sure you have SAUCE_USERNAME and SAUCE_ACCESS_KEY set as environment variables."
    else:
        unittest.main()
