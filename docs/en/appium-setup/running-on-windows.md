## Running Appium on Windows

### Limitations

If you are running Appium on Windows, you can use the
[Appium.exe](https://github.com/appium/appium-dot-exe) client, which will allow
you to quickly launch an Appium server and use the Inspector. You will not be
able to test iOS apps on a locally hosted server, because Appium relies on OS
X-only libraries to support iOS testing. You can however use the `Remote Server`
option to connect to an Appium server running on a Mac.

### Setup

To get started:

1. Install [node.js](http://nodejs.org/download/) (v.0.10 or greater). Use the
   installer from nodejs.org.
1. Install the [Android SDK](http://developer.android.com/sdk/index.html).
   You will need to run the 'android' tool (included in the SDK, in the `tools` folder) and make sure
   you have an API Level 17 or greater API installed. Set `ANDROID_HOME` to be
   your Android SDK path and add the `tools` and `platform-tools` folders to your
   PATH variable.
1. Install the Java JDK and set `JAVA_HOME` to your JDK folder.
1. Install [Apache Ant](http://ant.apache.org/bindownload.cgi) or use the one
   that comes with the Android Windows SDK in the eclipse\plugins folder. Be
   sure to add the folder containing Ant to your PATH variable.
1. Install [Apache Maven](http://maven.apache.org/download.cgi) and set the
   M2HOME and M2 environment variables. Set `M2HOME` to the directory maven is
   installed in, and set `M2` to `%M2HOME\bin`. Add the path you used for `M2` to
   your PATH.
1. Install [Git](http://git-scm.com/download/win) Be sure to install Git for
   windows to run in the regular command prompt.
1. Install [cURL](http://curl.haxx.se/download.html).

Now that you've downloaded everything, if you're running from source, run the
following .bat file in the folder where you cloned appium:

```
reset.bat
```

### Running Appium

To run tests on Windows, you will need to have the Android Emulator booted or
an Android Device connected that is running an AVD with API Level 17 or
greater. Then run Appium on the command line (via the `appium` command), or if
you're running from source, inside the folder where you installed appium, using
node.js:

```
node .
```

See the [server documentation](/docs/en/writing-running-appium/server-args.md) for all the command line
arguments.

### Notes

* You must supply the `--no-reset` and `--full-reset` flags for
  Android to work on Windows.
* There exists a hardware accelerated emulator for Android, it has it's own
  limitations. For more information you can check out this
  [page](/docs/en/appium-setup/android-hax-emulator.md).
* Make sure that `hw.battery=yes` in your AVD's `config.ini`.
