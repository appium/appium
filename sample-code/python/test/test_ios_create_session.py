import unittest
import os
import copy
import sys

from time import sleep

from appium import webdriver
from helpers import report_to_sauce, IOS_BASE_CAPS, EXECUTOR
from selenium.common.exceptions import WebDriverException


# Run standard unittest base.
class TestIOSCreateSession(unittest.TestCase):
    def tearDown(self):
        report_to_sauce(self.driver.session_id)

    def test_should_create_and_destroy_ios_session(self):
        caps = copy.copy(IOS_BASE_CAPS)
        caps['name'] = self.id()

        self.driver = webdriver.Remote(
            command_executor=EXECUTOR,
            desired_capabilities=caps
        )
        self.driver.implicitly_wait(10)

        app_element = self.driver.find_element_by_class_name('XCUIElementTypeApplication')
        self.assertEquals('TestApp', app_element.get_attribute('name'))

        self.driver.quit()

        # pause a moment because Sauce Labs takes a bit to stop accepting requests
        sleep(5)

        with self.assertRaises(WebDriverException) as excinfo:
            self.driver.find_element_by_class_name('XCUIElementTypeApplication')
        self.assertTrue(
            'has already finished' in str(excinfo.exception.msg) or
            'Unhandled endpoint' in str(excinfo.exception.msg)
        )
