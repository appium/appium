## How To Specify App Launch Intent Options

Most of the times Appium users do not need to worry about how app is launched as Appium takes care of this internally.
However, sometimes a user need the flexibility to control it. Eg. when a user need to pass some extra 
arguments to app during startup which can be used to modify app's behaviour

###How does the appium start App under test**

**Appium-UiAutomator2-Driver:** The Appium-UiAutomator2-Driver starts the app under test by issuing an intent using adb command ([read more about intents](https://developer.android.com/reference/android/content/Intent.html)). This adb command
is invoked by javascript driver. Appium users can pass extra arguments to this adb command using capabilitie `intentAction` ,`intentCategory`,`intentFlags` and `optionalIntentArguments`

**Appium-Espresso-Driver:**
The Appium-Espresso-Driver starts the the app by issuing the intent using the kotlin server. For starting app a default intent is used.
A user can override this default intent using `intentOptions` capability, 

eg in ruby, you can specify `intentOptions` capability as below:

````
intentOptions => {
    'action' => 'android.intent.action.MAIN',
    'categories' => 'android.intent.category.LAUNCHER',
    'component' => 'com.my.app/.MyLauncherActivity',
    'flags' => 'FLAG_ACTIVITY_NEW_TASK',
    'es' => [' key', ' Value ']
}
                                    
````

If you are using `intentOptions`, it is advisable to provide `action`, `categories`, `component` and `flags`. Value of `flags` must include `FLAG_ACTIVITY_NEW_TASK` if a new activity from outside of current context is being started
