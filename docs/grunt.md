Appium grunt commands
=============

[Grunt](http://gruntjs.com) is like make for Node.js! We use it to automate all
kinds of appium dev tasks. Here's what you can do:

Miscellaneous notes
--------

By default, `grunt buildApp` builds apps using the iPhone 6.1 simulator SDK.
You can overwrite the simulator by passing another SDK to grunt (to figure out
which SDKs you have available, try `xcodebuild -showsdks`:

    > grunt buildApp:UICatalog:iphonesimulator6.0

