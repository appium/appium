## Running Appium from Source

So you want to run Appium from source and help fix bugs and add features?
Great! Just fork the project, make a change, and send a pull request! Please
have a look at our [Style Guide](style-guide.md) before getting to work.
Please make sure the unit and functional tests pass before sending a pull
request; for more information on how to run tests, keep reading!

Make sure you read and follow the setup instructions in the README first.

### Setting up Appium from Source

An Appium setup involves the Appium server, which sends messages back and forth
between your test code and devices/emulators, and a test script, written in
whatever language binding exists that is compatible with Appium. Run an
instance of an Appium server, and then run your test.

The quick way to get started:

```center
$ git clone https://github.com/appium/appium.git
$ cd appium
$ ./reset.sh
$ sudo ./bin/authorize-ios.js # for ios only
$ node .
```

### Hacking on Appium

Make sure you have ant, maven, adb installed and added to system PATH, also you
would need the android-16 sdk (for Selendroid) and android-19 sdk installed.
From your local repo's command prompt, install the following packages using the
following commands (if you didn't install `node` using homebrew, you might have
to run npm with sudo privileges):

```center
npm install -g mocha
npm install -g grunt-cli
node bin/appium-doctor.js --dev
./reset.sh --dev
```

The first two commands install test and build tools (`sudo` may not be
necessary if you installed node.js via Homebrew). The third command verifies
that all of the dependencies are set up correctly (since dependencies for
building Appium are different from those for simply running Appium) and fourth
command installs all app dependencies and builds supporting binaries and test
apps. `reset.sh` is also the recommended command to run after pulling changes
from master. Running `reset.sh` with the `--dev` flag also installs git hooks
that make sure code quality is preserved before committing. At this point,
you're able to start the Appium server:

```center
node .
```

See [the server documentation](/docs/en/writing-running-appium/server-args.md)
for a full list of arguments.

Like the power of automating dev tasks? Check out the [Appium Grunt tasks](/docs/en/contributing-to-appium/grunt.md)
available to help with building apps, installing apps, generating docs, etc.

#### Hacking with Appium for iOS

To avoid a security dialog that may appear when launching your iOS apps you'll
have to modify your `/etc/authorization` file in one of two ways:

1. Manually modify the element following `<allow-root>` under `<key>system.privilege.taskport</key>`
   in your `/etc/authorization` file to `<true/>`.

2. Run the following grunt command which automatically modifies your
   `/etc/authorization` file for you:

    ```center
    sudo ./bin/authorize-ios.js
    ```

At this point, run:

    ```center
    ./reset.sh --ios --dev
    ```

Now your Appium instance is ready to go. Run `node .` to kick up the Appium server.

#### Hacking with Appium for Android

Bootstrap running for Android by running:

```center
./reset.sh --android --dev
```

If you want to use [Selendroid](http://github.com/DominikDary/selendroid) for
support on older Android platforms like 2.3, then run:

```center
./reset.sh --selendroid --dev
```

Make sure you have one and only one Android emulator or device running, e.g.
by running this command in another process (assuming the `emulator` command is
on your path):

```center
emulator -avd <MyAvdName>
```

Now you are ready to run the Appium server via `node .`.

#### Making sure you're up to date

Since Appium uses dev versions of some packages, it often becomes necessary to
install new `npm` packages or update various things. There's a handy shell script
to do all this for all platforms (the `--dev` flag gets dev npm dependencies
and test applications used in the Appium test suite). You will also need to do
this when Appium bumps its version up:

```center
./reset.sh --dev
```

Or you can run reset for individual platforms only:

```center
./reset.sh --ios --dev
./reset.sh --android --dev
./reset.sh --selendroid --dev
```

### Running Tests

First, check out our documentation on [running tests in
general](/docs/en/writing-running-appium/running-tests.md) Make sure your
system is set up properly for the platforms you desire to test on.

Once your system is set up and your code is up to date, you can run unit tests
with:

```center
grunt unit
```

You can run functional tests for all supported platforms (after ensuring that
Appium is running in another window with `node .`) with:

```center
bin/test.sh
```

Or you can run particular platform tests with `test.sh`:

```center
bin/test.sh --android
bin/test.sh --ios
bin/test.sh --ios7
bin/test.sh --ios71
```

Before committing code, please run `grunt` to execute some basic tests and
check your changes against code quality standards. Note that this should happen
automatically if you ran `reset.sh --dev`, which sets up the git pre-commit
hooks.

```center
grunt lint
> Running "newer:jshint" (newer) task
> 
> Running "newer:jshint:files" (newer) task
> No newer files to process.
> 
> Running "newer:jshint:test" (newer) task
> No newer files to process.
> 
> Running "newer:jshint:examples" (newer) task
> No newer files to process.
> 
> Running "jscs:files" (jscs) task
> >> 303 files without code style errors.
```

#### Running individual tests

If you have an Appium server listening, you can run individual test files using
Mocha, for example:

```center
DEVICE=ios71 mocha -t 60000 -R spec test/functional/ios/testapp/simple.js
```

Or individual tests (e.g., a test with the word "alert" in the name):

```center
DEVICE=ios6 mocha -t 60000 -R spec --grep "alert" test/functional/ios/uicatalog
```

For windows you have to use `set DEVICE=android` in cmd to run above tests, for
example:

```center
set DEVICE=android
mocha -t 60000 -R spec test/functional/android/apidemos/alerts-specs.js
```

NOTE: For Android, you will need an emulator/device with screen size of 4.0"
(480x800). Some tests might fail on a different screen size.

`DEVICE` must be set to a valid value: `ios71`, `ios6`, `android`, `selendroid`
