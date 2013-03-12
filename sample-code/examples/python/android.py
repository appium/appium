import os
from time import sleep

from selenium import webdriver

desired_caps = {}
desired_caps['device'] = 'Android'
desired_caps['browserName'] = ''
desired_caps['version'] = '4.2'
desired_caps['app'] = os.path.abspath('../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk')
desired_caps['app-package'] = 'com.example.android.apis'
desired_caps['app-activity'] = 'ApiDemos'

driver = webdriver.Remote('http://localhost:4723/wd/hub', desired_caps)

print driver.get_window_size()
elem = driver.find_element_by_name('Graphics')
elem.click()
elem = driver.find_element_by_name('Arcs')
elem.click()
driver.quit()
