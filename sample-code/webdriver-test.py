#	Copyright 2012 Appium Committers
#
#	Licensed to the Apache Software Foundation (ASF) under one
#	or more contributor license agreements.  See the NOTICE file
#	distributed with this work for additional information
#	regarding copyright ownership.  The ASF licenses this file
#	to you under the Apache License, Version 2.0 (the
#	"License"); you may not use this file except in compliance
#	with the License.  You may obtain a copy of the License at
#
#	http://www.apache.org/licenses/LICENSE-2.0
#
#	Unless required by applicable law or agreed to in writing,
#	software distributed under the License is distributed on an
#	"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#	KIND, either express or implied.  See the License for the
#	specific language governing permissions and limitations
#	under the License.

from selenium import webdriver
from random import randint

# generate two random numbers
num1 = randint(1,9)
num2 = randint(1,9)

# create a webdriver instance
command_url = 'http://localhost:4723/wd/hub'
iphone = webdriver.DesiredCapabilities.IPHONE
print '\nconnecting to web driver @ ' + command_url
driver = webdriver.Remote(command_url, iphone)

# enter the two numbers into the fields
fields = driver.find_elements_by_tag_name('textField')
print 'Entering "' + str(num1) + '" into the first text field' 
fields[0].send_keys(num1)
print 'Entering "' + str(num2) + '" into the second text field'
fields[1].send_keys(num2)

# submit the form
buttons = driver.find_elements_by_tag_name('button')
print 'Submitting the form'
buttons[0].click()

# validate the sum
labels = driver.find_elements_by_tag_name('staticText')
correctAnswer = num1 + num2
displayedAnswer = labels[0].text
if int(displayedAnswer) is correctAnswer:
    print '\033[92m' + 'SUM = ' + displayedAnswer + '\033[0m'
else:
    print '\033[91m' + 'SUM = ' + displayedAnswer + ', it should be ' + str(correctAnswer) + '\033[0m'

# quit the webdriver instance
print 'Quitting webdriver\n'
driver.quit()
