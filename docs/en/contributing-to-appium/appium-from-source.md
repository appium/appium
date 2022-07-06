## Running Appium from Source

So you want to run Appium from source and help fix bugs and add features?
Great! If you can fork a project, make a change, and send a pull request,
you can contribute to Appium.

Please have a look at our [Style Guide](style-guide.md) and [ensure the tests pass](#running-tests)
before sending a pull request.

### Node.js

Appium is written in JavaScript, and run with the [Node.js](https://nodejs.org/) engine. While Node.js can be installed globally on the system, a version manager is _highly_ recommended.

* NVM - [https://github.com/creationix/nvm](https://github.com/creationix/nvm)
* N - [https://github.com/tj/n](https://github.com/tj/n)
* nvm-windows - [https://github.com/coreybutler/nvm-windows](https://github.com/coreybutler/nvm-windows)

Your Node.js installation will include the [npm](https://www.npmjs.com/) package manager, which Appium
will need in order to manage dependencies.

As of this writing (July 6 2022), **an Appium development environment requires `npm` v7+, which ships with Node.js v16.x.**.  For a development environment, alternative package managers are not recommended nor supported.

The "[current](https://github.com/nodejs/release)" version of Node.js is recommended.


### Setting up Appium from Source

An Appium setup involves the Appium server, which sends messages back and forth
between your test code and devices/emulators, and a test script, written in
whatever language binding exists that is compatible with Appium. Run an
instance of an Appium server, and then run your test.

The quick way to get started:

```bash
git clone https://github.com/appium/appium.git
cd appium
npm install
npm start
```

### Hacking on Appium

First, run

```bash
npm install
```

Now, you can run [`appium-doctor`](https://npmjs.com/@appium/doctor) to verify
the prerequisites are present (since prerequisites for _building_ Appium
are different from those for simply _running_ it).  `@appium/doctor` (and its
command-line executable, `appium-doctor`) lives in the Appium core monorepo,
and can be run via:

```bash
npm run doctor -- --dev
```

The `@appium/doctor` package can also be used via `npx`:

```bash
npx @appium/doctor --dev
```

At this point, you will be able to start the Appium server:

```bash
npm start
```

See [the server documentation](/docs/en/writing-running-appium/server-args.md)
for a full list of command line arguments that can be used.

#### Hacking with Appium for Android

To work on Android, make sure you have `ant`, `maven`, and `adb` installed
and added to system `PATH` environment variable. Also you would need the
android-19+ SDK installed.

From your local repo's command prompt, install/run the following:

```bash
npm run reinstall
```

Make sure you have one and only one Android emulator or device running, e.g.,
by running this command in another process (assuming the `emulator` command is
on your path):

```bash
emulator -avd <MyAvdName>
```

Now you are ready to run the Appium server via `npm start`.

#### Making sure you're up to date

Since Appium uses dev versions of some packages, it often becomes necessary to
install new packages or update various things. Running `npm install` will
update everything necessary. You will also need to do this when Appium bumps
its version up. If something seems amiss, try a complete clean of build artifacts
and re-installation using the `reinstall` script:

```bash
npm run reinstall
```

### Different packages

Appium is made up of a number of different packages.  As of v2.0, the core packages
live in a [_monorepo_](https://github.com/appium/appium) (including this documentation).
The packages themselves live in the `packages` subdirectory.  Running `npm install`
will automatically install all dependencies for all packages in this directory by way of [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces) (which is new as of npm v7.x).

### Running Tests

First, check out our documentation on [running tests in
general](/docs/en/writing-running-appium/running-tests.md) Make sure your
system is set up properly for the platforms you desire to test on.

Once your system is set up and your code is up to date, you can run unit tests
with:

```bash
npm test
```

You can run functional tests for all supported platforms (after ensuring that
Appium is running in another window with `npm start`) with:

```bash
npm run test:e2e
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

Each Appium package installs a pre-commit hook which will run the [linter](https://eslint.org/) and automatically reformat your changes.  A lint failure will prevent the commit from occurring; this can be bypassed with the `git` flag `-n` to commit "temporary" work.

Once code is committed and a [pull request](https://help.github.com/articles/about-pull-requests/)
is made to the correct Appium respository on [GitHub](https://github.com/), Appium build system
will run all of the functional tests.
