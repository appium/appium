import pytest
import datetime
import os

from helpers import ensure_dir


def pytest_configure(config):
    if not hasattr(config, 'input'):
        current_day = '{:%Y_%m_%d_%H_%S}'.format(datetime.datetime.now())
        ensure_dir(os.path.join(os.path.dirname(__file__), 'input', current_day))
        result_dir = os.path.join(os.path.dirname(__file__), 'results', current_day)
        ensure_dir(result_dir)
        result_dir_test_run = result_dir
        ensure_dir(os.path.join(result_dir_test_run, 'screenshots'))
        ensure_dir(os.path.join(result_dir_test_run, 'logcat'))
        config.screen_shot_dir = os.path.join(result_dir_test_run, 'screenshots')
        config.logcat_dir = os.path.join(result_dir_test_run, 'logcat')


class DeviceLogger:
    def __init__(self, logcat_dir, screenshot_dir):
        self.screenshot_dir = screenshot_dir
        self.logcat_dir = logcat_dir


@pytest.fixture(scope='function')
def device_logger(request):
    logcat_dir = request.config.logcat_dir
    screenshot_dir = request.config.screen_shot_dir
    return DeviceLogger(logcat_dir, screenshot_dir)
