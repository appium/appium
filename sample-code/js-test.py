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

import os
import sys
from random import randint

# import appium
appiumpath = os.path.abspath(os.path.join(os.path.split(os.path.abspath(__file__))[0],'../appium'))
sys.path.append(appiumpath)
import appium

# generate two random numbers
num1 = randint(1,9)
num2 = randint(1,9)

# create an appium instance
driver = appium.Appium(sys.argv[1])
driver.start()

# enter the two numbers into the fields
print 'Entering "' + str(num1) + '" into the first text field' 
driver.proxy('target.frontMostApp().mainWindow().textFields()[0].setValue("' + str(num1) + '");')
print 'Entering "' + str(num2) + '" into the second text field'
driver.proxy('target.frontMostApp().mainWindow().textFields()[1].setValue("' + str(num2) + '");')

# submit the form
print 'Submitting the form'
driver.proxy('target.frontMostApp().mainWindow().buttons()[0].tap();')

# validate the sum
answer = driver.proxy('target.frontMostApp().mainWindow().staticTexts()[0].value()')[0][1]
correctanswer = num1 + num2
if int(answer) is correctanswer:
	print '\033[92m' + 'SUM = ' + answer + '\033[0m'
else:
	print '\033[91m' + 'SUM = ' + answer + ', it should be ' + str(correctanswer) + '\033[0m'

# quit appium
driver.stop()
