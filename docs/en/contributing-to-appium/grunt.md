## Appium grunt commands

[Grunt](http://gruntjs.com) is like make for Node.js! We use it to automate all
kinds of appium dev tasks. Here's what you can do:

|Task|Description|
|----|-----------|
|grunt lint|Run JSLint|
|grunt test|Run the unit tests|
|grunt unit|Run the unit tests|
|grunt getSampleCode|Download sample code and apps. Accepts `:hardcore` parameter|
|grunt buildApp:&lt;AppName&gt;:&lt;SDK&gt;|Build an iOS app for the iPhone Simulator.  Expects there to be a .app at `sample-code/apps/<AppName>/build/Release-iphonesimulator/<AppName>.app`. Default SDK is 'iphonesimulator7.1'|
|grunt signApp:&lt;certName&gt;|Signs the test app with an absolute path to an iOS dev certificate|
|grunt authorize|Authorize your simulator to run without prompting|
|grunt log|Tail appium.log (useful when running tests)|
|grunt configAndroidBootstrap|Configure the android bootstrap jar so it can be built with ant|
|grunt buildAndroidBootstrap|Build the android bootstrap jar with ant|
|grunt buildSelendroidServer|Build the selendroid server|
|grunt configAndroidApp:&lt;AppName&gt;|Configure an android test app so it can be built with ant. Expects an android project at `sample-code/apps/<AppName>`|
|grunt buildAndroidApp:&lt;AppName&gt;|Build an android app using ant. Expects the app to be at `sample-code/apps/<AppName>`|
|grunt installAndroidApp:&lt;AppName&gt;|Installs an android app to the currently running emulator or device|
|grunt docs|Generate docs|
|grunt generateAppiumIo|Take Appium's README.md and turn it into HTML for getting-started.html of appium.io|
|grunt setConfigVer:&lt;device&gt;|Say that &lt;device&gt; is configured for the version of Appium listed in package.json|

### Miscellaneous notes

By default, `grunt buildApp` builds apps using the iPhone 7.1 simulator SDK.
You can overwrite the simulator by passing another SDK to grunt (to figure out
which SDKs you have available, try running `xcodebuild -showsdks`):

    > grunt buildApp:UICatalog:iphonesimulator6.1
