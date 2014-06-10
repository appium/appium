import os
import glob
import unittest
from time import sleep

from appium import webdriver

PLATFORM_VERSION = '4.4'


class AndroidWebViewTests(unittest.TestCase):

    def setUp(self):
        app = os.path.abspath(
                os.path.join(os.path.dirname(__file__),
                             '../../apps/selendroid-test-app.apk'))
        desired_caps = {
            'app': app,
            'appPackage': 'io.selendroid.testapp',
            'appActivity': '.HomeScreenActivity',
            'platformName': 'Android',
            'platformVersion': PLATFORM_VERSION,
            'deviceName': 'Android Emulator'
        }

        if (PLATFORM_VERSION != '4.4'):
            desired_caps['automationName'] = 'selendroid'

        self.driver = webdriver.Remote('http://localhost:4723/wd/hub',
                                       desired_caps)

    def test_webview(self):
        if (PLATFORM_VERSION == '4.4'):
            button = self.driver.find_element_by_accessibility_id('buttonStartWebviewCD')
        else:
            button = self.driver.find_element_by_name('buttonStartWebviewCD')
        button.click()

        self.driver.switch_to.context('WEBVIEW_0')

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
    suite = unittest.TestLoader().loadTestsFromTestCase(AndroidWebViewTests)
    unittest.TextTestRunner(verbosity=2).run(suite)
