import unittest
import os

from appium import webdriver
from helpers import take_screenhot_and_syslog, IOS_APP_PATH, EXECUTOR
from selenium.common.exceptions import InvalidSessionIdException


# Run standard unittest base.
class TestIOSSelectors(unittest.TestCase):

    def setUp(self):
        self.driver = webdriver.Remote(
            command_executor=EXECUTOR,
            desired_capabilities={
                'app': IOS_APP_PATH,
                'platformName': 'iOS',
                'automationName': 'XCUITest',
                'platformVersion': os.getenv('IOS_PLATFORM_VERSION') or '12.1',
                'deviceName': os.getenv('IOS_DEVICE_NAME') or 'iPhone 8',
            }
        )
        self.driver.implicitly_wait(10)

    def test_should_create_and_destroy_ios_session(self):
        app_element = self.driver.find_element_by_class_name('XCUIElementTypeApplication')
        app_element_name = app_element.get_attribute('name')

        self.assertEquals('TestApp', app_element_name)
        self.driver.quit()

        with self.assertRaises(InvalidSessionIdException) as excinfo:
            self.driver.title
        self.assertEquals('A session is either terminated or not started', excinfo.exception.msg)
