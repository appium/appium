import pytest
import os

from appium import webdriver
from helpers import take_screenhot_and_syslog, EXECUTOR
from selenium.common.exceptions import InvalidSessionIdException


class TestIOSCreateWebSession():

    @pytest.fixture(scope='function')
    def driver(self, request, device_logger):
        calling_request = request._pyfuncitem.name
        driver = webdriver.Remote(
            command_executor=EXECUTOR,
            desired_capabilities={
                'platformName': 'iOS',
                'automationName': 'XCUITest',
                'platformVersion': os.getenv('IOS_PLATFORM_VERSION') or '12.1',
                'deviceName': os.getenv('IOS_DEVICE_NAME') or 'iPhone 8',
                'browserName': 'Safari'
            }
        )

        def fin():
            take_screenhot_and_syslog(driver, device_logger, calling_request)

        request.addfinalizer(fin)

        driver.implicitly_wait(10)
        return driver

    def test_should_create_and_destroy_android_session(self, driver):
        driver.get('https://www.google.com')
        title = driver.title

        assert 'Google' == title
        driver.quit()

        with pytest.raises(InvalidSessionIdException) as excinfo:
            driver.title
        assert 'A session is either terminated or not started' == excinfo.value.msg
