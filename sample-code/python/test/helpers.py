import os
from selenium.common.exceptions import InvalidSessionIdException


ANDROID_APP_PATH = 'http://appium.github.io/appium/assets/ApiDemos-debug.apk' if os.getenv(
    'SAUCE_LABS') else os.path.abspath('../apps/ApiDemos-debug.apk')

IOS_APP_PATH = 'http://appium.github.io/appium/assets/TestApp7.1.app.zip' if os.getenv(
    'SAUCE_LABS') else os.path.abspath('../apps/TestApp.app.zip')

if os.getenv('SAUCE_USERNAME') and os.getenv('SAUCE_ACCESS_KEY'):
    EXECUTOR = 'http://{}:{}@ondemand.saucelabs.com:80/wd/hub'.format(
        os.getenv('SAUCE_USERNAME'), os.getenv('SAUCE_ACCESS_KEY'))
else:
    EXECUTOR = 'http://127.0.0.1:4723/wd/hub'


def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)


def take_screenhot_and_logcat(driver, device_logger, calling_request):
    __save_log_type(driver, device_logger, calling_request, 'logcat')


def take_screenhot_and_syslog(driver, device_logger, calling_request):
    __save_log_type(driver, device_logger, calling_request, 'syslog')


def __save_log_type(driver, device_logger, calling_request, type):
    logcat_dir = device_logger.logcat_dir
    screenshot_dir = device_logger.screenshot_dir

    try:
        driver.save_screenshot(os.path.join(screenshot_dir, calling_request + '.png'))
        logcat_data = driver.get_log(type)
    except InvalidSessionIdException:
        logcat_data = ''

    with open(os.path.join(logcat_dir, '{}_{}.log'.format(calling_request, type)), 'wb') as logcat_file:
        for data in logcat_data:
            data_string = '{}:  {}'.format(data['timestamp'], data['message'])
            logcat_file.write((data_string + '\n').encode('UTF-8'))
    logcat_file.close()
