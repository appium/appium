## Running Appium from Source

So you want to run Appium from source and help fix bugs and add features?
Great! Just fork the project, make a change, and send a pull request! Please
have a look at our [Style Guide](style-guide.md) before getting to work.
Please make sure the unit and functional tests pass before sending a pull
request; for more information on how to run tests, keep reading!

### Node.js

Appium is written in JavaScript, and run with the [Node.js](https://nodejs.org/) engine. Currently
version 6+ is supported. While Node.js can be installed globally on the system,
a version manager is _highly_ recommended.
* NVM - [https://github.com/creationix/nvm](https://github.com/creationix/nvm)
* N - [https://github.com/tj/n](https://github.com/tj/n)

Your Node.js installation will include the [NPM](https://www.npmjs.com/) package manager, which Appium
will need in order to manage dependencies. Appiums supports NPM version 3+.

### Setting up Appium from Source

An Appium setup involves the Appium server, which sends messages back and forth
between your test code and devices/emulators, and a test script, written in
whatever language binding exists that is compatible with Appium. Run an
instance of an Appium server, and then run your test.

The quick way to get started:

```
git clone https://github.com/appium/appium.git
cd appium
npm install
npm run build
node .
```

### Hacking on Appium

Install the [appium-doctor](https://github.com/appium/appium-doctor) tool, and run it to verify all of the
dependencies are set up correctly (since dependencies for building Appium
are different from those for simply running it):
```
npm install -g appium-doctor
appium-doctor --dev
```
Install the Node.js dependencies:
```
npm install
```

When pulling new code from GitHub, if there are changes to `package.json` it
is necessary to remove the old dependencies and re-run `npm install`:

```
rm -rf node_modules && rm -rf package-lock.json && npm install
```

At this point, you will be able to start the Appium server:

```
node .
```

See [the server documentation](/docs/en/writing-running-appium/server-args.md)
for a full list of command line arguments that can be used.

#### Hacking with Appium for iOS

To avoid a security dialog that may appear when launching your iOS apps you'll
have to modify your `/etc/authorization` file in one of two ways:

1. Manually modify the element following `<allow-root>` under `<key>system.privilege.taskport</key>`
   in your `/etc/authorization` file to `<true/>`.

2. Run the following command which automatically modifies your
   `/etc/authorization` file for you:

    ```
    sudo npm run authorize-ios
	```

At this point, run:

```
rm -rf node_modules && rm -rf package-lock.json && npm install
```

Now your Appium instance is ready to go. Run `node .` to kick up the Appium server.

#### Hacking with Appium for Android

To work on Android, make sure you have `ant`, `maven`, and `adb` installed
and added to system `PATH` environment variable. Also you would need the
android-19+ sdk installed.
From your local repo's command prompt, install/run the following:

Set up Appium by running:

```
rm -rf node_modules && rm -rf package-lock.json && npm install
```

Make sure you have one and only one Android emulator or device running, e.g.,
by running this command in another process (assuming the `emulator` command is
on your path):

```
emulator -avd <MyAvdName>
```

Now you are ready to run the Appium server via `node .`.

#### Making sure you're up to date

Since Appium uses dev versions of some packages, it often becomes necessary to
install new `npm` packages or update various things. Running `npm install` will
update everything necessary. You will also need to do this when Appium bumps
its version up. Prior to running `npm install` it is recommended to remove
all the old dependencies in the `node_modules` directory:

```
rm -rf node_modules && rm -rf package-lock.json && npm install
```

### Different packages

Appium is made up of a number of different packages. While it is often possible
to work in a single package, it is also often the case that work, whether fixing
a bug or adding a new feature, requires working on multiple packages simultaneously.

Unfortunately the dependencies installed when running `npm install` are those that
have already been published, so some work is needed to link together local development
versions of the packages that are being worked on.

In the case where one package, `A`, depends on another package, `B`, the following steps
are necessary to link the two:
1. In one terminal, enter into package `B`
    ```
    cd B
    ```
2. Use [NPM link](https://docs.npmjs.com/cli/link) to create symbolic link to this package
    ```
    npm link
    ```
3. In another terminal, enter into package `A`
    ```
    cd A
    ```
4. Use [NPM link](https://docs.npmjs.com/cli/link) to link the dependent package `B` to the development version
    ```
    npm link B
    ```

Now the version of `B` that `A` uses will be your local version. Remember, however, that
changes made to the JavaScript will only be available when they have been transpiled, so
when you are going to test from package `A`, run `npm run build` in the directory for
package `B`.

### Running Tests

First, check out our documentation on [running tests in
general](/docs/en/writing-running-appium/running-tests.md) Make sure your
system is set up properly for the platforms you desire to test on.

Once your system is set up and your code is up to date, you can run unit tests
with:

```
npm run test
```

You can run functional tests for all supported platforms (after ensuring that
Appium is running in another window with `node .`) with:

```
npm run e2e-test
```

### Debugging Node

This project has multiple launch configurations for running NodeJS code from within [VSCode](https://code.visualstudio.com/)

* _Debug_: Runs Appium server in debug mode so you can set breakpoints inside VSCode source files
* _Attach Debug_: Attach to a currently running Appium server
  * Example Usage
    * From root, run `node --inspect-brk . --port 5555`
    * Run `attach debug`
    * Setup breakpoints in VSCode
* _Test All_: Runs all mocha tests in `test/`. Can setup breakpoints in test code and source code
* _Test Current File_: Runs the currently focused-on mocha file. Fails if it's not valid mocha test

### Committing code

Each Appium package installs a pre-commit hook which will run the [linter](https://eslint.org/) and
the unit tests before the commit is made. Any error in either of these will stop
the commit from occurring.

Once code is committed and a [pull request](https://help.github.com/articles/about-pull-requests/)
is made to the correct Appium respository on [GitHub](https://github.com/), Appium build system
will run all of the functional tests.
