## Running Appium on Linux

### Limitations

If you are running Appium on Linux, you cannot use the prebuilt '.app',
which is built for OS X only. Additionally, you will not be able to test iOS
apps because Appium relies on OS X-only libraries to support iOS testing.

### Setup

To get started, you'll need to install node.js (v.0.10 or greater). Just
follow the [instructions for your flavor of linux](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).

Once you've got node.js installed, install the [Android SDK](http://developer.android.com/sdk/index.html).
You will need to run the 'android' tool (included in the SDK, under the 'tools' directory).

Run the 'android' tool and use it to install an API Level 17 or greater.

You will also need [Apache Ant](http://ant.apache.org/) to build the bootstrap jar that Appium uses for running against Android simulators/devices.

Finally, set `$ANDROID_HOME` to be your Android SDK path. If you unzipped the
Android SDK to /usr/local/adt/, for example, you should add this to your
shell startup:

    export ANDROID_HOME="/usr/local/adt/sdk"

Now that you're setup to run Appium, run `./reset.sh --android` from your
Appium checkout to install all the dependencies.

### Additional Setup for Older Versions of Android

Appium uses, and comes prepackaged with, Selendroid for running Android versions 2.3 to 4.1.
Appium switches to using Selendroid automatically when it detects older versions, but there is some additional setup required.

* Make sure you have [Maven 3.1.1](http://maven.apache.org/download.cgi) or newer installed (`mvn`).
* Run `./reset.sh --selendroid` from your Appium checkout

### Running Appium

To run tests on Linux, you will need to have the Android Emulator booted and
running an AVD with API Level 17 or greater. Then run Appium (`appium`) after
installing via NPM, or `node .` in the source directory if running from source.

See the [server documentation](/docs/en/writing-running-appium/server-args.md) for all the command line arguments.

### Notes

* There exists a hardware accelerated emulator for android, it has its own
  limitations. For more information you can check out this
  [page](/docs/en/appium-setup/android-hax-emulator.md).
* Make sure that `hw.battery=yes` in your AVD's `config.ini`, if you want to
  run any of the Appium tests
