import os


def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)


def take_screenhot_and_logcat(driver, device_logger, calling_request):
    logcat_dir = device_logger.logcat_dir
    screenshot_dir = device_logger.screenshot_dir
    driver.save_screenshot(os.path.join(screenshot_dir, calling_request + ".png"))
    logcat_file = open(os.path.join(logcat_dir, calling_request + "_logcat.log"), 'wb')
    logcat_data = driver.get_log('logcat')
    for data in logcat_data:
        data_string = str(data['timestamp']) + ":  " + str(data['message'])
        logcat_file.write((data_string + '\n').encode("UTF-8"))
    logcat_file.close()


def take_screenhot_and_syslog(driver, device_logger, calling_request):
    syslog_dir = device_logger.logcat_dir
    screenshot_dir = device_logger.screenshot_dir
    driver.save_screenshot(os.path.join(screenshot_dir, calling_request + ".png"))
    syslog_file = open(os.path.join(syslog_dir, calling_request + "_syslog.log"), 'wb')
    syslog_data = driver.get_log('syslog')
    for data in syslog_data:
        data_string = str(data['timestamp']) + ":  " + str(data['message'])
        syslog_file.write((data_string + '\n').encode("UTF-8"))
    syslog_file.close()
