# How to get Appium server logs
  If there's an issue with a test execution, the Appium server logs are normally the best way to find the root of the issue. This document shows how to get the Appium server logs and a short explaination of how to read them.

## Using the [desktop GUI](https://github.com/appium/appium-desktop)
  There is a button in the desktop GUI which will export the logs to a file. 
 ![download raw logs](https://i.imgur.com/wEqZLfC.png)

## Using Appium CLI command 
  Using the CLI command will write the logs to standard out. So using `>` or `>>` you can write the logs to a file. For example: 

`appium --log-timestamp --device-name $DEVICE_NAME --platform-name $DEVICE_PLATFORM_NAME --app $APP_PATH --udid $DEVICE_UDID --chromedriver-executable $CHROMEDRIVER_EXECUTABLE_PATH  >> appiumlog.txt 2>&1`

where `2>&1` will redirect standard error to standard out. 

## How to read the logs


 
 
