*** Settings ***
Documentation  Android Web Session
Resource  ../resources/resource.robot

*** Test Cases ***
Should Create and Destroy Android Web Session
  open application  http://127.0.0.1:4723/wd/hub  automationName=${ANDROID_AUTOMATION_NAME}
  ...  platformName=${ANDROID_PLATFORM_NAME}  platformVersion=${ANDROID_PLATFORM_VERSION}
  ...  browserName=Chrome
  go to url  https://www.google.com
  ${page_title}  execute script  return document.title
  should be equal  ${page_title}  Google
  close application
  sleep  3s
  run keyword and expect error  No application is open  execute script  return document.title