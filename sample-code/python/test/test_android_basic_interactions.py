import pytest
import os
import textwrap
import copy

from appium import webdriver
from helpers import report_to_sauce, take_screenshot_and_logcat, ANDROID_BASE_CAPS, EXECUTOR


class TestAndroidBasicInteractions():
    PACKAGE = 'io.appium.android.apis'
    SEARCH_ACTIVITY = '.app.SearchInvoke'
    ALERT_DIALOG_ACTIVITY = '.app.AlertDialogSamples'

    @pytest.fixture(scope='function')
    def driver(self, request, device_logger):
        calling_request = request._pyfuncitem.name

        caps = copy.copy(ANDROID_BASE_CAPS)
        caps['name'] = calling_request
        caps['appActivity'] = self.SEARCH_ACTIVITY

        driver = webdriver.Remote(
            command_executor=EXECUTOR,
            desired_capabilities=caps
        )

        def fin():
            report_to_sauce(driver.session_id)
            take_screenshot_and_logcat(driver, device_logger, calling_request)
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
