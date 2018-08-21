import os


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
    driver.save_screenshot(os.path.join(screenshot_dir, calling_request + '.png'))
    logcat_data = driver.get_log(type)
    with open(os.path.join(logcat_dir, '{}_{}.log'.format(calling_request, type)), 'wb') as logcat_file:
        for data in logcat_data:
            data_string = '{}:  {}'.format(data['timestamp'], data['message'])
            logcat_file.write((data_string + '\n').encode('UTF-8'))
    logcat_file.close()
