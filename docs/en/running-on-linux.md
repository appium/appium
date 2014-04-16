Running Appium on Linux
=======================

# Limitations

If you are running Appium on Linux, you cannot use the prebuilt '.app',
which is built for OS X only. Additionally, you will not be able to test iOS
apps because Appium relies on OS X-only libraries to support iOS testing.

# Setup

To get started, you'll need to install node.js (v.0.8 or greater). Just
follow the [instructions for your flavor of linux](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).

Once you've got node.js installed, install the [Android SDK](http://developer.android.com/sdk/index.html).
You will need to run the 'android' tool (included in the SDK) and make sure
you have an API Level 17 or greater API installed. You will also need Ant to
build the bootstrap jar that Appium uses for testing Android.

Finally, set `$ANDROID_HOME` to be your Android SDK path. If you unzipped the
Android SDK to /usr/local/adt/, for example, you should add this to your shell startup:

    export ANDROID_HOME="/usr/local/adt/sdk"

Now that you're setup to run Appium, run `./reset.sh --android` from your Appium checkout to install all the dependencies.

# Running Appium

To run tests on Linux, you will need to have the Android Emulator booted and
running an AVD with API Level 17 or greater. Then run Appium on the command line using node.js:

    node .

See the [server documentation](server-args) for all the command line arguments.

# Notes
* There exists a hardware accelerated emulator for android, it has it's own
  limitations. For more information you can check out this
  [page](android-hax-emulator).
* Make sure that `hw.battery=yes` in your AVD's `config.ini`.