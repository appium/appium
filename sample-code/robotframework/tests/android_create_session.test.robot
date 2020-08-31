*** Settings ***
Documentation  Android Create Native Test Session
Resource  ../resources/resource.robot

*** Test Cases ***
Should Create and Destroy Android Session
  open application  http://127.0.0.1:4723/wd/hub  automationName=${ANDROID_AUTOMATION_NAME}
  ...  platformName=${ANDROID_PLATFORM_NAME}  platformVersion=${ANDROID_PLATFORM_VERSION}
  ...  app=${ANDROID_APP}  appPackage=${ANDROID_APP_PACKAGE}
  ${activity}  get activity
  should be equal  ${activity}  .ApiDemos
  close application
  sleep  3s
  run keyword and expect error  No application is open  get activity