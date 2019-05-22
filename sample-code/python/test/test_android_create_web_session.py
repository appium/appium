import unittest
import os
import copy
import sys

from time import sleep

from appium import webdriver
from helpers import report_to_sauce, ANDROID_BASE_CAPS, EXECUTOR
from selenium.common.exceptions import WebDriverException


class TestAndroidCreateWebSession(unittest.TestCase):
    def tearDown(self):
        report_to_sauce(self.driver.session_id)

    def test_should_create_and_destroy_android_web_session(self):
        caps = copy.copy(ANDROID_BASE_CAPS)
        caps['name'] = 'test_should_create_and_destroy_android_web_session'
        # can only specify one of `app` and `browserName`
        caps['browserName'] = 'Chrome'
        caps.pop('app')

        self.driver = webdriver.Remote(
            command_executor=EXECUTOR,
            desired_capabilities=caps
        )
        self.driver.implicitly_wait(10)

        self.driver.get('https://www.google.com')

        assert 'Google' == self.driver.title

        self.driver.quit()

        sleep(5)

        with self.assertRaises(WebDriverException) as excinfo:
            self.driver.title
        self.assertTrue('has already finished' in str(excinfo.exception.msg))
