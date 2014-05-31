import os
import glob
import unittest
from time import sleep

from appium import webdriver


class TestAndroidWebView(unittest.TestCase):

    def setUp(self):
        app = os.path.abspath(
                os.path.join(os.path.dirname(__file__),
                             '../../apps/selendroid-test-app.apk'))
        desired_caps = {
            'app': app,
            'appPackage': 'io.selendroid.testapp',
            'appActivity': '.HomeScreenActivity',
            'platformName': 'Android',
            'platformVersion': '4.4',
            'deviceName': 'Android Emulator'
        }

        self.driver = webdriver.Remote('http://localhost:4723/wd/hub',
                                       desired_caps)

    def test(self):
        button = self.driver.find_element_by_name('buttonStartWebviewCD')
        button.click()

        self.driver.switch_to.context('WEBVIEW')

        input_field = self.driver.find_element_by_id('name_input')
        sleep(1)
        input_field.clear()
        input_field.send_keys('Appium User')
        input_field.submit()

        # test that everything is a-ok
        source = self.driver.page_source
        self.assertNotEqual(-1, source.find('This is my way of saying hello'))
        self.assertNotEqual(-1, source.find('"Appium User"'))

    def tearDown(self):
        self.driver.quit()


if __name__ == '__main__':
    unittest.main()
