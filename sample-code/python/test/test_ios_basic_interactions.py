import pytest
import os

from appium import webdriver
from helpers import take_screenhot_and_syslog


class TestIOSBasicInteractions():
    APP_PATH = 'http://appium.github.io/appium/assets/TestApp7.1.app.zip' if os.getenv(
        'SAUCE_LABS') else os.path.abspath('../apps/TestApp.app.zip')

    if os.getenv('SAUCE_USERNAME') and os.getenv('SAUCE_ACCESS_KEY'):
        EXECUTOR = 'http://{}:{}@ondemand.saucelabs.com:80/wd/hub'.format(
            os.getenv('SAUCE_USERNAME'), os.getenv('SAUCE_ACCESS_KEY'))
    else:
        EXECUTOR = 'http://127.0.0.1:4723/wd/hub'

    @pytest.fixture(scope='function')
    def driver(self, request, device_logger):
        calling_request = request._pyfuncitem.name
        driver = webdriver.Remote(
            command_executor=self.EXECUTOR,
            desired_capabilities={
                'app': self.APP_PATH,
                'platformName': 'iOS',
                'automationName': 'XCUITest',
                'platformVersion': os.getenv('IOS_PLATFORM_VERSION') or '11.1',
                'deviceName': os.getenv('IOS_DEVICE_NAME') or 'iPhone 6s',
            }
        )
        driver.implicitly_wait(10)

        def fin():
            take_screenhot_and_syslog(driver, device_logger, calling_request)
            driver.quit()

        request.addfinalizer(fin)
        return driver

    def test_should_send_keys_to_inputs(self, driver):
        text_field_el = driver.find_element_by_id('TextField1')
        assert None == text_field_el.get_attribute('value')
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
