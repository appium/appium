import pytest
import os
import textwrap

from appium import webdriver
from helpers import take_screenhot_and_logcat


class TestAndroidBasicInteractions():
    PACKAGE = 'io.appium.android.apis'
    SEARCH_ACTIVITY = '.app.SearchInvoke'
    ALERT_DIALOG_ACTIVITY = '.app.AlertDialogSamples'
    APP_PATH = 'http://appium.github.io/appium/assets/ApiDemos-debug.apk' if os.getenv(
        'SAUCE_LABS') else os.path.abspath('../apps/ApiDemos-debug.apk')

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
                'platformName': 'Android',
                'automationName': 'UIAutomator2',
                'platformVersion': os.getenv('ANDROID_PLATFORM_VERSION') or '7.1',
                'deviceName': os.getenv('ANDROID_DEVICE_VERSION') or 'Android',
                'appActivity': self.SEARCH_ACTIVITY
            }
        )

        def fin():
            take_screenhot_and_logcat(driver, device_logger, calling_request)
            driver.quit()

        request.addfinalizer(fin)

        driver.implicitly_wait(10)
        return driver

    def test_should_send_keys_to_search_box_and_then_check_the_value(self, driver):
        search_box_element = driver.find_element_by_id('txt_query_prefill')
        search_box_element.send_keys('Hello world!')

        on_search_requested_button = driver.find_element_by_id('btn_start_search')
        on_search_requested_button.click()

        search_text = driver.find_element_by_id('android:id/search_src_text')
        search_text_value = search_text.text

        assert 'Hello world!' == search_text_value

    def test_should_click_a_button_that_opens_an_alert_and_then_dismisses_it(self, driver):
        driver.start_activity(self.PACKAGE, self.ALERT_DIALOG_ACTIVITY)

        open_dialog_button = driver.find_element_by_id('io.appium.android.apis:id/two_buttons')
        open_dialog_button.click()

        alert_element = driver.find_element_by_id('android:id/alertTitle')
        alert_text = alert_element.text

        assert textwrap.dedent('''\
        Lorem ipsum dolor sit aie consectetur adipiscing
        Plloaso mako nuto siwuf cakso dodtos anr koop.''') == alert_text

        close_dialog_button = driver.find_element_by_id('android:id/button1')
        close_dialog_button.click()
