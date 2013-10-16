# Contributing to Appium

Fork the project, make a change, and send a pull request! Please have a look at our
[Style Guide](https://github.com/appium/appium/blob/master/docs/style-guide.md) before getting to work.
Please make sure the unit and functional tests pass before sending a pull request; for more
information on how to run tests, keep reading!

Make sure you read and follow the setup instructions in the README first.

## Using Appium

An Appium setup involves the Appium server, which sends messages back and forth between
your test code and devices/emulators, and a test script, written in whatever language
binding exists that is compatible with Appium. Run an instance of an Appium server,
and then run your test.

The quick way to get started:

    $ git clone https://github.com/appium/appium.git
    $ cd appium
    $ ./reset.sh
    $ sudo grunt authorize # for ios only
    $ node .

## Hacking with Appium

From your local repo's command prompt, install the following packages using the
following commands (if you didn't install `node` using homebrew, you might have
to run npm with sudo privileges):

    npm install -g mocha
    npm install -g grunt-cli
    ./reset.sh --dev

The first two commands install test and build tools (`sudo` may not be necessary
if you installed node.js via Homebrew). The third command installs all app
dependencies and builds supporting binaries and test apps. `reset.sh` is also the
recommended command to run after pulling changes from master. At this point,
you're able to start the Appium server:

    node .

There are some arguments you can pass into the Appium server from the command-line:

    node . --app /absolute/path/to/app  // launch Appium server with app
    node . --launch // pre-launch the app when appium loads
    node . --log /my/appium.log // log to file instead of stdout
    node . --quiet // don't log verbose output

See [the server documentation](https://github.com/appium/appium/blob/master/docs/server-args.md)
for a full list of arguments.

Like the power of automating dev tasks? Check out the [Appium Grunt tasks](https://github.com/appium/appium/blob/master/docs/grunt.md)
available to help with building apps, installing apps, generating docs, etc.

### Hacking with Appium for iOS

To avoid a security dialog that may appear when launching your iOS apps you'll
have to modify your `/etc/authorization` file in one of two ways:

1. Manually modify the element following `<allow-root>` under `<key>system.privilege.taskport</key>`
   in your `/etc/authorization` file to `<true/>`.

2. Run the following grunt command which automatically modifies your
   `/etc/authorization` file for you:

       sudo grunt authorize

At this point, run:

    ./reset.sh --ios --dev

Now your Appium instance is ready to go. Run `node .` to kick up the Appium server.

### Hacking with Appium for Android

Bootstrap running for Android by running:

    ./reset.sh --android --dev

If you want to use [Selendroid](http://github.com/DominikDary/selendroid) for support on
older Android platforms like 2.3, then run:

    ./reset.sh --selendroid --dev

Make sure you have one and only one Android emulator or device running, e.g.
by running this command in another process (assuming the `emulator` command is
on your path):

    emulator -avd <MyAvdName>

Now you are ready to run the Appium server via `node .`.

### Making sure you're up to date

Since Appium uses dev versions of some packages, it often becomes necessary to
install new `npm` packages or update various things. There's a handy shell script
to do all this for all platforms (the `--dev` flag gets dev npm dependencies
and test applications used in the Appium test suite):

    ./reset.sh --dev

Or you can run reset for individual platforms only:

    ./reset.sh --ios --dev
    ./reset.sh --android --dev
    ./reset.sh --selendroid --dev

## Running Tests

First, check out our documentation on [running tests in general](https://github.com/appium/appium/blob/master/docs/running-tests.md)
Make sure your system is set up properly for the platforms you desire to test on.

Once your system is set up and your code is up to date, you can run unit tests with:

    grunt unit

You can run functional tests for all supported platforms with:

    ./test.sh

Or you can run particular platform tests with `test.sh`:

    ./test.sh --android
    ./test.sh --ios
    ./test.sh --ios7

Before committing code, please run `grunt` to execute some basic tests and check
your changes against code quality standards:

    grunt
    > Running "lint:all" (lint) task
    > Lint free.
    > Done, without errors.

### Running individual tests

If you have an Appium server listening, you can run individual test files using
Mocha, for example:

    mocha -t 60000 -R spec test/functional/testapp/simple.js

Or individual tests (e.g., a test with the word "alert" in the name):

    mocha -t 60000 -R spec --grep "alert" test/functional/apidemos

You can also run all of appium's tests this way. In one window, `node
.`, in another window, sequentially (waiting for each to pass, making
sure emulator is up, etc...):

    alias mm="mocha -t 60000 -R spec"
    mm test/functional/apidemos
    mm test/functional/prefs
    mm test/functional/safari
    mm test/functional/selendroid
    mm test/functional/testapp
    mm test/functional/uicatalog
    mm test/functional/webview
