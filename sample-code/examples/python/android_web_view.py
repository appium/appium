import os
import glob
import unittest
from time import sleep
from selenium import webdriver


class TestAndroidWebView(unittest.TestCase):

    def setUp(self):
        app = os.path.abspath(
            glob.glob(os.path.join(
                os.path.dirname(__file__), '../../apps/selendroid-test-app.apk')))
        desired_caps = {
            'device': 'selendroid',
            'app': app,
            'app-package': 'io.selendroid.testapp',
            'app-activity': '.HomeScreenActivity'
        }

        self.driver = webdriver.Remote('http://localhost:4723/wd/hub',
                                       desired_caps)

    def test(self):
        button = self.driver.find_element_by_id('buttonStartWebview')
        button.click()

        self.driver.switch_to_window('WEBVIEW')

        input_field = self.driver.find_element_by_id('name_input')
        input_field.send_keys('Mathieu')
        input_field.submit()

    def tearDown(self):
        self.driver.quit()


if __name__ == '__main__':
    unittest.main()
