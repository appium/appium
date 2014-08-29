## Settings ##

Settings are a new concept introduced by appium. They are currently not a part of the Mobile JSON Wire Protocol, or the Webdriver spec.

Settings are a way to specify the behavior of the appium server.

Settings are:
 - Mutable, they can be changed during a session
 - Only relevant during the session they are applied. They are reset for each new session.
 - Control the way the appium server behaves during test automation. They do not apply to controlling the app or device under test.

An example of a setting would be XPath compression for Android. Android can be set to ignore elements in the View Hierarchy which it deems irrelevant. Setting this abbreviation will cause tests that rely on XPath for locating elements to run faster. A user who *wants* to access the ignored elements however, would want to disable XPath compression, and reenable it afterwards.

Another example of a use-case for settings would be telling appium to ignore elements which are not visible.

Settings are implemented via the following API endpoints:

**POST** /session/:sessionId/appium/settings

>Expects a JSON hash of settings, where keys correspond to setting names, and values to the value of the setting.
```
{
  settings: {
   xpath_compression : true  
  }  
}
```

**GET** /session/:sessionId/appium/settings

>Returns a JSON hash of all the currently specified settings.
```
{
  settings: {
   xpath_compression : true  
  }  
}
```
