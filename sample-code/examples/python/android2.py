import os
from selenium import webdriver

desired_caps = {}
desired_caps['device'] = 'Android'
desired_caps['browserName'] = ''
desired_caps['version'] = '4.2'
desired_caps['app'] = os.path.abspath('../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk')
desired_caps['app-package'] = 'com.example.android.apis'
desired_caps['app-activity'] = 'ApiDemos'

driver = webdriver.Remote('http://localhost:4723/wd/hub', desired_caps)

el = driver.find_element_by_name("Animation")
assert el.text == "Animation"

el = driver.find_element_by_tag_name("text")
assert el.text == "API Demos"

el = driver.find_element_by_name("App")
el.click()

els = driver.find_elements_by_tag_name("text")
assert els[2].text == "Activity"
driver.quit()
