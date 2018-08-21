import unittest
import os

from appium import webdriver

# Run standard unittest base.
class TestIOSSelectors(unittest.TestCase):
    APP_PATH = 'http://appium.github.io/appium/assets/TestApp7.1.app.zip' if os.getenv(
        'SAUCE_LABS') else os.path.abspath('../apps/TestApp.app.zip')

    if os.getenv('SAUCE_USERNAME') and os.getenv('SAUCE_ACCESS_KEY'):
        EXECUTOR = 'http://%s:%s@ondemand.saucelabs.com:80/wd/hub' % (
            os.getenv('SAUCE_USERNAME'), os.getenv('SAUCE_ACCESS_KEY'))
    else:
        EXECUTOR = 'http://127.0.0.1:4723/wd/hub'

    def setUp(self):
        self.driver = webdriver.Remote(
            command_executor=self.EXECUTOR,
            desired_capabilities={
                'app': self.APP_PATH,
                'platformName': 'iOS',
                'automationName': 'XCUITest',
                'platformVersion': os.getenv('IOS_PLATFORM_VERSION') or '11.1',
                'deviceName': os.getenv('IOS_DEVICE_NAME') or 'iPhone 6s',
            }
        )
        self.driver.implicitly_wait(10)

    def test_should_create_and_destroy_ios_session(self):
        app_element = self.driver.find_element_by_class_name('XCUIElementTypeApplication')
        app_element_name = app_element.get_attribute('name')

        assert 'TestApp' == app_element_name
        self.driver.quit()
