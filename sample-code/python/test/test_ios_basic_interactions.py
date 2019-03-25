import pytest
import os

from appium import webdriver
from helpers import take_screenhot_and_syslog, IOS_APP_PATH, EXECUTOR


class TestIOSBasicInteractions():

    @pytest.fixture(scope='function')
    def driver(self, request, device_logger):
        calling_request = request._pyfuncitem.name
        driver = webdriver.Remote(
            command_executor=EXECUTOR,
            desired_capabilities={
                'app': IOS_APP_PATH,
                'platformName': 'iOS',
                'automationName': 'XCUITest',
                'platformVersion': os.getenv('IOS_PLATFORM_VERSION') or '12.1',
                'deviceName': os.getenv('IOS_DEVICE_NAME') or 'iPhone 8',
            }
        )

        def fin():
            take_screenhot_and_syslog(driver, device_logger, calling_request)
            driver.quit()

        request.addfinalizer(fin)

        driver.implicitly_wait(10)
        return driver

    def test_should_send_keys_to_inputs(self, driver):
        text_field_el = driver.find_element_by_id('TextField1')
        assert text_field_el.get_attribute('value') is None
        text_field_el.send_keys('Hello World!')
        assert 'Hello World!' == text_field_el.get_attribute('value')

    def test_should_click_a_button_that_opens_an_alert(self, driver):
        button_element_id = 'show alert'
        button_element = driver.find_element_by_accessibility_id(button_element_id)
        button_element.click()

        alert_title_element_id = 'Cool title'
        alert_title_element = driver.find_element_by_accessibility_id(alert_title_element_id)
        alert_title = alert_title_element.get_attribute('name')
        assert 'Cool title' == alert_title
