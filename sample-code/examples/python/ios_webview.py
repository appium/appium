"""
Simple iOS WebView tests.
"""
import unittest
import os
from random import randint
from appium import webdriver
from time import sleep

from selenium.webdriver.common.keys import Keys

class WebViewIOSTests(unittest.TestCase):

    def setUp(self):
        # set up appium
        app = os.path.join(os.path.dirname(__file__),
                           '../../apps/WebViewApp/build/Release-iphonesimulator',
                           'WebViewApp.app')
        app = os.path.abspath(app)
        self.driver = webdriver.Remote(
            command_executor='http://127.0.0.1:4723/wd/hub',
            desired_capabilities={
                'app': app,
                'deviceName': 'iPhone Simulator',
                'platformName': 'iOS',
                'platformVersion': '7.1'
            })

    def tearDown(self):
        self.driver.quit()

    def test_get_url(self):
        url_el = self.driver.find_element_by_xpath('//UIAApplication[1]/UIAWindow[1]/UIATextField[1]')
        url_el.send_keys('http://www.google.com')

        go_el = self.driver.find_element_by_accessibility_id('Go')
        go_el.click()
        sleep(1)

        self.driver.switch_to.context('WEBVIEW')

        search = self.driver.find_element_by_name('q')
        search.send_keys('sauce labs')
        search.send_keys(Keys.RETURN)

        # allow the page to load
        sleep(1)

        self.assertEquals('sauce labs - Google Search', self.driver.title)


if __name__ == '__main__':
    suite = unittest.TestLoader().loadTestsFromTestCase(WebViewIOSTests)
    unittest.TextTestRunner(verbosity=2).run(suite)
