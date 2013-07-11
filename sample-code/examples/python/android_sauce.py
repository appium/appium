import os
from selenium import webdriver

desired_caps = {}
desired_caps['device'] = 'Android'
desired_caps['browserName'] = ''
desired_caps['version'] = '4.2'
desired_caps['app'] = 'http://appium.s3.amazonaws.com/NotesList.apk'
desired_caps['app-package'] = 'com.example.android.notepad'
desired_caps['app-activity'] = '.NotesList'

SAUCE_USERNAME = os.environ.get('SAUCE_USERNAME')
SAUCE_ACCESS_KEY = os.environ.get('SAUCE_ACCESS_KEY')

driver = webdriver.Remote('http://%s:%s@ondemand.saucelabs.com:80/wd/hub' % (SAUCE_USERNAME, SAUCE_ACCESS_KEY), desired_caps)

el = driver.find_element_by_name("New note")
el.click()

el = driver.find_element_by_tag_name("textfield")
el.send_keys("This is a new note!")

el = driver.find_element_by_name("Save")
el.click()

els = driver.find_elements_by_tag_name("text")
assert els[2].text == "This is a new note!"

els[2].click()

driver.quit()
