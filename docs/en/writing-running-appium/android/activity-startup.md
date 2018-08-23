## How To Troubleshoot Activities Startup


### Capabilities

> The Activity class is a crucial component of an Android app, and the way activities are launched and put together is a fundamental part of the platform's application model. Unlike programming paradigms in which apps are launched with a main() method, the Android system initiates code in an Activity instance by invoking specific callback methods that correspond to specific stages of its lifecycle.
> &copy; [Android Developer Documentation](https://developer.android.com/guide/components/activities/intro-activities)

Appium needs to know package and activity names in order to properly initialize the application under test. This information is expected to be provided in driver capabilities and consists of the following keys:

- `appActivity`: The name of the main application activity
- `appPackage`: The identifier of the application package
- `appWaitActivity`: The name of the application activity to wait for/which starts the first
- `appWaitPackage`: The id of the application package to wait for/which starts the first
- `appWaitDuration`: The maximum duration to wait until the `appWaitActivity` is focused in milliseconds (20000 by default)

All these capabilities are optional. If they are not set explicitly then Appium tries to auto detect them by reading their values from the APK manifest. Although, if the application under test is supposed to be already installed on the device (`noReset=true`) then at least `appActivity` and `appPackage` options are required to be set, since no package manifest is available in such case. If you don't set `appWaitPackage` and `appWaitActivity` explicitly then these are getting assigned to `appPackage`/`appActivity` values automatically. For more details check on the implementation of `packageAndLaunchActivityFromManifest` method in the [appium-adb](https://github.com/appium/appium-adb/blob/master/lib/tools/android-manifest.js) package.


### How Appium Starts Activities

Activities are started by [Call activity manager `am`](https://developer.android.com/studio/command-line/adb#am). Appium tries to start the `appPackage`/`appActivity` combination using `am start` and then waits until the `appWaitPackage`/`appWaitActivity` is focused or the `appWaitDuration` timeout expires. The currently focused activity name is parsed from `adb shell dumpsys window windows` command output (`mFocusedApp` or `mCurrentFocus` entries). For more details check on the implementation of `startApp`, and `getFocusedPackageAndActivity` methods in the [appium-adb](https://github.com/appium/appium-adb/blob/master/lib/tools/apk-utils.js) package.


### Possible Problems And Solutions

#### java.lang.SecurityException: Permission Denial: starting Intent

The full error description usually looks like `'java.lang.SecurityException: Permission Denial: starting Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] flg=0x10200000 cmp=com.mypackage/.myactivity.MainActivity launchParam=MultiScreenLaunchParams { mDisplayId=0 mBaseDisplayId=0 mFlags=0 } } from null (pid=11366, uid=2000) not exported from uid 10191`. Such error might be the indication of the fact that the combination of application package and activity name, which has been passed to Appium as `appPackage`/`appActivity` (or auto detected implicitly), is not the correct one to start the application under test. As a solution, it is necessary to check the correct values with the application developer and test them manually first by executing: `adb shell am start -W -n com.myfixedpackage/.myfixedactivity.MainActivity -S -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -f 0x10200000`. If this commands succeeds manually and starts the necessary application on the device then it will work for Appium as well.

#### com.myactivity or com.myapp.com.myactivity never started

Thus exception usually indicates, that the first application activity is not the same package/activity, as it is set (or auto detected) by `appWaitPackage`/`appWaitActivity`. Such error normally happens in applications having multiple activities. In order to resolve the problem one should check with application developer regarding which activity/package is the very first one that appears on application startup. The currently focused activity name might be verified using the `adb shell dumpsys window windows` command mentioned above. Also, Appium allows to use wildcards while setting `appWaitActivity` value. This might be particularly useful if the activity name is generated dynamically or it is not the same all the time. For example `com.mycomany.*` will match any of `com.mycomany.foo`, `com.mycomany.bar`.

If you've double checked that activity names are correct, but the startup still times out, then try to increase the value of `appWaitDuration` capability. Normally, the default 20 seconds is enough for the most of applications, however, some bigger apps might require more time to start and show the first activity. Please, don't create such apps.
