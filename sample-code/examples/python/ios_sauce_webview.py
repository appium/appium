"""An example of Appium running on Sauce, with a webview.

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
from time import sleep

from selenium.webdriver.common.keys import Keys

SAUCE_USERNAME=os.environ.get('SAUCE_USERNAME')
SAUCE_ACCESS_KEY=os.environ.get('SAUCE_ACCESS_KEY')
base64string = base64.encodestring('%s:%s' % (SAUCE_USERNAME, SAUCE_ACCESS_KEY))[:-1]

class WebViewIOSSauceTests(unittest.TestCase):

    def setUp(self):
        # set up appium
        app = 'http://appium.s3.amazonaws.com/WebViewApp6.0.app.zip'

        self.driver = webdriver.Remote(
            command_executor = 'http://%s:%s@ondemand.saucelabs.com:80/wd/hub' % (SAUCE_USERNAME, SAUCE_ACCESS_KEY),
            desired_capabilities = {
                'appium-version': '1.1.0',
                'name': 'Appium iOS WebView Test',
                'platformName': 'iOS',
                'deviceName': 'iPhone Simulator',
                'platformVersion': '7.1',
                'app': app
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

    def test_get_url(self):
        url_el = self.driver.find_element_by_xpath('//UIAApplication[1]/UIAWindow[1]/UIATextField[1]')
        url_el.send_keys('http://www.google.com')

        go_el = self.driver.find_element_by_accessibility_id('Go')
        go_el.click()

        self.driver.switch_to.context('WEBVIEW')

        search = self.driver.find_element_by_name('q')
        search.send_keys('sauce labs')
        search.send_keys(Keys.RETURN)

        # allow the page to load
        sleep(1)

        try:
            self.assertEquals('sauce labs - Google Search', self.driver.title)
            self._set_test_status(self.driver.session_id, True)
        except:
            self._set_test_status(self.driver.session_id, False)


if __name__ == '__main__':
    if not (SAUCE_USERNAME and SAUCE_ACCESS_KEY):
        print "Make sure you have SAUCE_USERNAME and SAUCE_ACCESS_KEY set as environment variables."
    else:
        unittest.main()
