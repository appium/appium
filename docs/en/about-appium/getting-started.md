Note that this documentation explains about Appium 1.x.
Please refer to [the README in the Appium repository](https://github.com/appium/appium) or [Appium 2.0 documentation](https://appium.github.io/appium) about Appium 2.0.

## Getting Started

This doc will get you up and running with a simple Appium 1.x test and introduce
you to some basic Appium ideas. For a more comprehensive introduction to Appium concepts,
please check out the [conceptual introduction](/docs/en/about-appium/intro.md).

### Installing Appium

Appium can be installed in one of two ways: via [NPM](https://npmjs.com) or by
downloading [Appium Desktop](https://github.com/appium/appium-desktop), which
is a graphical, desktop-based way to launch the Appium server.

#### Installation via NPM

If you want to run Appium via an `npm install`, hack with Appium, or contribute
to Appium, you will need [Node.js and NPM](http://nodejs.org) (use
[nvm](https://github.com/creationix/nvm),
[n](https://github.com/visionmedia/n), or `brew install node` to install
Node.js. Make sure you have not installed Node or Appium with `sudo`, otherwise
you'll run into problems). We recommend the latest stable version, though
Appium supports Node.js 12+.
(The minimal Node.js version follows [EOL schedule](https://nodejs.org/en/about/releases/))

The actual installation is as simple as:

```
npm install -g appium
```

#### Installation via Desktop App Download

Simply download the latest version of Appium Desktop from the [releases
page](https://github.com/appium/appium-desktop/releases).

### Driver-Specific Setup

You probably want to use Appium to automate something specific, like an iOS or
Android application. Support for the automation of a particular platform is
provided by an Appium "driver". There are a number of such drivers that give
you access to different kinds of automation technologies, and each come with
their own particular setup requirements. Most of these requirements are the
same requirements as for app development on a specific platform. For example,
to automate Android applications using one of our Android drivers, you'll need
the Android SDK configured on your system.

At some point, make sure you review the driver documentation for the platform
you want to automate, so your system is set up correctly:

- The [XCUITest Driver](/docs/en/drivers/ios-xcuitest.md) (for iOS and tvOS apps)
- The [Espresso Driver](/docs/en/drivers/android-espresso.md) (for Android apps)
- The [UiAutomator2 Driver](/docs/en/drivers/android-uiautomator2.md) (for Android apps)
- The [Windows Driver](/docs/en/drivers/windows.md) (for Windows Desktop apps)
- The [Mac Driver](/docs/en/drivers/mac.md) (for Mac Desktop apps)

### Verifying the Installation

To verify that all of Appium's dependencies are met you can use
`appium-doctor`. Install it with `npm install -g appium-doctor`, then run the
`appium-doctor` command, supplying the `--ios` or `--android` flags to verify
that all of the dependencies are set up correctly.

### Appium Clients

When all is said and done, Appium is just an HTTP server. It sits and waits for
connections from a client, which then instructs Appium what kind of session to
start and what kind of automation behaviors to enact once a session is started.
This means that you never use Appium just by itself. You always have to use it
with a client library of some kind (or, if you're adventurous, cURL!).

Luckily, Appium speaks the same protocol as
[Selenium](http://www.seleniumhq.org/), called the WebDriver Protocol. You can
do a lot of things with Appium just by using one of the standard Selenium
clients. You may even have one of these on your system already. It's enough to
get started, especially if you're using Appium for the purpose of testing web
browsers on mobile platforms.

Appium can do things that Selenium can't, though, just like mobile devices can
do things that web browsers can't. For that reason, we have a set of Appium
clients in a variety of programming languages, that extend the regular old
Selenium clients with additional functionality. You can see the list of clients
and links to download instructions at the [Appium clients
list](/docs/en/about-appium/appium-clients.md).

Before moving forward, make sure you have a client downloaded in your favorite
language and ready to go.

### Starting Appium

Now we can kick up an Appium server, either by running it from the command line
like so (assuming the NPM install was successful):

```
appium
```

Or by clicking the huge Start Server button inside of Appium Desktop.

Appium will now show you a little welcome message showing the version of Appium
you're running and what port it's listening on (the default is `4723`). This
port information is vital since you will have to direct your test client to
make sure to connect to Appium on this port. If you want to change the port,
you can do so by using the `-p` flag when starting Appium (be sure to check out
the full list of [server
parameters](/docs/en/writing-running-appium/server-args.md)).

### Running Your First Test

In this section we'll run a basic "Hello World" Android test. We've chosen
Android because it's available on all platforms. We'll be using the
[UiAutomator2 Driver](/docs/en/drivers/android-uiautomator2.md) so ensure
you've read through that doc and gotten your system set up appropriately. We'll
also be using JavaScript as the language so that we don't have to deal with
additional dependencies.

(Chances are, you'll eventually want to automate something other than Android
using something other than JavaScript. In that case, check out our
[sample-code](https://github.com/appium/appium/tree/1.x/sample-code), which has code
samples for many languages and platforms.)

#### Prerequisites

- We'll assume you have an Android 8.0 emulator configured and running (the
  example will work on lower versions, just fix the version numbers
  accordingly)
- We'll assume you have [this test
  APK](https://github.com/appium/appium/raw/1.x/sample-code/apps/ApiDemos-debug.apk)
  downloaded and available on your local filesystem

#### Setting up the Appium Client

For this example, we'll use [Webdriver.io](http://webdriver.io) as our Appium
client. Create a directory for this example, then run:

```
npm init -y
```
Once the project has been initialized, install `webdriverio`:
```
npm install webdriverio
```

#### Session Initialization

Now we can create our test file, named `index.js`, and initialize the
client object:

```js
// javascript
const wdio = require("webdriverio");
```

The next thing we need to do is to start an Appium session. We do this by
defining a set of server options and Desired Capabilities, and calling
`wdio.remote()` with them. Desired Capabilities are just a set of keys and
values that get sent to the Appium server during session initialization, that
tell Appium what kind of thing we want to automate. The minimum set of required
capabilities for any Appium driver should include:

- `platformName`: the name of the platform to automate
- `platformVersion`: the version of the platform to automate
- `deviceName`: the kind of device to automate
- `app`: the path to the app you want to automate (but use the `browserName`
  capability instead in the case of automating a web browser)
- `automationName`: the name of the driver you wish to use

For more information on Desired Capabilities and for a list of all the
Capabilities you can use in Appium, see our [Capabilities
doc](/docs/en/writing-running-appium/caps.md).

So here is how we begin to construct a session in our test file:

```js
// javascript
const opts = {
  path: '/wd/hub',
  port: 4723,
  capabilities: {
    platformName: "Android",
    platformVersion: "8",
    deviceName: "Android Emulator",
    app: "/path/to/the/downloaded/ApiDemos-debug.apk",
    appPackage: "io.appium.android.apis",
    appActivity: ".view.TextFields",
    automationName: "UiAutomator2"
  }
};

async function main () {
  const client = await wdio.remote(opts);

  await client.deleteSession();
}

main();
```

#### Running Test Commands

You can see that we've specified our Appium port and also constructed our
Desired Capabilities to match our requirements (but don't forget to replace the
path with the actual download path for your system). We've registered this fact
with `webdriverio` and now have a client object which will represent the
connection to the Appium server. From here, we can go ahead and start the
session, perform some test commands, and end the session. In our case, we will
simply type into a text field and check that the correct text was entered:

```js
// javascript

const field = await client.$("android.widget.EditText");
await field.setValue("Hello World!");
const value = await field.getText();
assert.strictEqual(value, "Hello World!");
```

What's going on here is that after creating a session and launching our app,
we're instructing Appium to find an element in the app hierarchy and type into
it. The same field is then queried for its text, which is asserted to be what we
expect.

Putting it all together, the file should look like:

```js
// webdriverio as W3C capabilities

const wdio = require("webdriverio");
const assert = require("assert");

const opts = {
  path: '/wd/hub',
  port: 4723,
  capabilities: {
    platformName: "Android",
    platformVersion: "8",
    "appium:deviceName": "Android Emulator",
    "appium:app": "/path/to/the/downloaded/ApiDemos-debug.apk",
    "appium:appPackage": "io.appium.android.apis",
    "appium:appActivity": ".view.TextFields",
    "appium:automationName": "UiAutomator2"
  }
};

async function main () {
  const client = await wdio.remote(opts);

  const field = await client.$("android.widget.EditText");
  await field.setValue("Hello World!");
  const value = await field.getText();
  assert.strictEqual(value,"Hello World!");

  await client.deleteSession();
}

main();
```

You can try and run this test on your own. Simply save it and execute it using
`node`:
```
node index.js
```
If everything is set up correctly, you'll see Appium begin spitting out
lots of logs and eventually the app will pop up on the screen and start
behaving as if an invisible user were tapping on it!

### What's Next

We've only scratched the surface of what you can do with Appium. Check out
these resources to help you on your journey:

- The Appium [command reference](https://appium.io/docs/en/commands/status/) - learn about what commands are available, how to use them with specific client libraries, etc...
- The [sample-code](https://github.com/appium/appium/tree/1.x/sample-code) directory, where lots more code samples are available

- [discuss.appium.io](https://discuss.appium.io) - this is the Appium community forum, which is a great first place to go for help getting started, or if you think you may have run into a bug
- The Appium [issue tracker](https://github.com/appium/appium/issues) - let the Appium maintainers know here if you think you've found a bug
