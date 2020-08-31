*** Settings ***
Library  AppiumLibrary
Library  BuiltIn
Library  String
Library  OperatingSystem

*** Variables ***
${ANDROID_AUTOMATION_NAME}    UIAutomator2
${ANDROID_APP}                ${CURDIR}/../../apps/ApiDemos-debug.apk
${ANDROID_PLATFORM_NAME}      Android
${ANDROID_PLATFORM_VERSION}   %{ANDROID_PLATFORM_VERSION=8.0}
${ANDROID_APP_PACKAGE}        io.appium.android.apis
${ANDROID_DEVICE_NAME}        %{ANDROID_DEVICE_NAME=Android Emulator}

${IOS_AUTOMATION_NAME}        XCUITest
${IOS_APP}                    ${CURDIR}/../../apps/TestApp.app.zip
${IOS_PLATFORM_NAME}          iOS
${IOS_PLATFORM_VERSION}       %{IOS_PLATFORM_VERSION=12.2}
${IOS_DEVICE_NAME}            %{IOS_DEVICE_NAME=iPhone 8 Simulator}
${EXECUTOR}                   http://127.0.0.1:4723/wd/hub


*** Keywords ***
Set Local Executor
  return from keyword  http://127.0.0.1:4723/wd/hub

Set Sauce Executor
  set suite variable  ${IOS_APP}  http://appium.github.io/appium/assets/TestApp9.4.app.zip
  set suite variable  ${ANDROID_APP}  http://appium.github.io/appium/assets/ApiDemos-debug.apk
  ${url}  format string  http://{}:{}@ondemand.saucelabs.com:80/wd/hub  %{SAUCE_USERNAME}  %{SAUCE_ACCESS_KEY}
  return from keyword  ${url}

Set Executor
  ${sauce_labs}  get environment variable  SAUCE_LABS  ${EMPTY}
  ${sauce_username}  get environment variable  SAUCE_USERNAME  ${EMPTY}
  ${sauce_password}  get environment variable  SAUCE_PASSWORD  ${EMPTY}
  ${ex}  run keyword if  '${sauce_labs}' != '${EMPTY}' and '${sauce_username}' != '${EMPTY}' and '${sauce_password}' != '${EMPTY}}'  Set Sauce Executor
  ...  ELSE  Set Local Executor
  set test variable  ${EXECUTOR}  ${ex}
  return from keyword  ${executor}

Open Android Test App
  [Arguments]    ${appActivity}=${EMPTY}
  ${executor}  set executor
  open application  ${executor}  automationName=${ANDROID_AUTOMATION_NAME}
  ...  app=${ANDROID_APP}  platformName=${ANDROID_PLATFORM_NAME}  platformVersion=${ANDROID_PLATFORM_VERSION}
  ...  appPackage=${ANDROID_APP_PACKAGE}  appActivity=${appActivity}
  ...  deviceName=${ANDROID_DEVICE_NAME}


Open iOS Test App
  ${executor}  set executor
  open application  ${executor}  automationName=${IOS_AUTOMATION_NAME}
  ...  app=${IOS_APP}  platformName=${IOS_PLATFORM_NAME}  platformVersion=${IOS_PLATFORM_VERSION}
  ...  deviceName=${IOS_DEVICE_NAME}