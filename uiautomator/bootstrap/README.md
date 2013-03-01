Here's how Android testing works:

* Install Android SDK if you haven't already
* Make sure you have Android SDK API = 17 installed
* Make sure `$ANDROID_HOME` is set to your android sdk path
* Make sure you have an AVD set to an android version &gt; 4.1
* Configure and build the android bootstrap JAR:
    grunt configAndroidBootstrap
    grunt build
* Configure and build the example app:
    grunt configAndroidApp:ApiDemos
    grunt buildAndroidApp:ApiDemos
* Make sure your emulator is running, e.g. in another window:
    emulator -avd MyAvdName
* Now you can run appium in one process and try the tests:
    mocha -t 120000 -R spec test/functional/apidemos/*.js
