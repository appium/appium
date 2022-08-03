---
title: Building Appium Drivers
---

Appium wants to make it easy for anyone to develop their own automation drivers as part of the
Appium ecosystem. This guide will explain what's involved and how you can accomplish various driver
development tasks using the tools Appium provides. This guide assumes you (1) are a competent user of
Appium, (2) are a competent Node.js developer, and (3) that you have read and understood the
[Driver Intro](../intro/drivers.md).

If that describes you, great! This guide will get you started.

## Before you create your driver

Before you get to work implementing your driver, it's important to have a few things sorted out.
For example, you need to know what your driver will do. Which platform is it trying to expose
WebDriver automation for?

Appium doesn't magically give you the power to automate any platform. All it does is give you a set
of convenient tools for implementing the WebDriver Protocol. So if you want to create, for example,
a driver for a new app platform, you'll need to know how to automate apps on that platform *without Appium*.

This usually means that you need to be very familiar with app development for a given platform. And
it usually means that you will rely on tools or SDKs provided by the platform vendor.

Basically, if you can't answer the question **"how would I launch, remotely trigger behaviours, and
read state from an app on this platform?" then you're not quite ready to write an Appium driver**.
Make sure you do the research to feel comfortable that there *is* a path forward. Once there is,
coding it up and making it available as an Appium driver should be the easy part!

## Other drivers to reference

One of the greatest things about building an Appium driver is that there are already a number of
open source Appium drivers which you can look at for reference. There is
a [fake-driver](https://github.com/appium/appium/tree/2.0/packages/fake-driver) sample driver which
does basically nothing other than showcase some of the things described in this guide.

And of course, all of Appium's official drivers are open source and available in repositories at
the project's GitHub organization. So if you ever find yourself asking, "how does a driver do X?",
read the code for these drivers! Also don't be afraid to ask questions of the Appium developers if
you get stuck; we're always happy to help make sure the driver development experience is a good
one!

## Basic requirements for Appium drivers

These are the things your driver *must* do (or be), if you want it to be a valid Appium driver.

### Node.js package with Appium extension metadata

All Appium drivers are fundamentally Node.js packages, and therefore must have a valid
`package.json`. Your driver is not _limited_ to Node.js, but it must provide an adapter written in Node.js so it can be loaded by Appium.

Your `package.json` must include `appium` as a `peerDependency`. The requirements for the
dependency versions should be as loose as possible (unless you happen to know your driver will only
work with certain versions of Appium). For Appium 2.0, for example, this would look something like
`^2.0.0`, declaring that your driver works with any version of Appium that starts with 2.x.

Your `package.json` must contain an `appium` field, like this (we call this the 'Appium extension
metadata'):

    ```json
    {
      ...,
      "appium": {
        "driverName": "fake",
        "automationName": "Fake",
        "platformNames": [
          "Fake"
        ],
        "mainClass": "FakeDriver"
      },
      ...
    }
    ```

The required subfields are:

* `driverName`: this should be a short name for your driver.
* `automationName`: this should be the string users will use for their `appium:automationName`
  capability to tell Appium to use *your* driver.
* `platformNames`: this is an array of one or more platform names considered valid for your driver.
  When a user sends in the `platformName` capability to start a session, it must be included in
  this list for your driver to handle the session. Known platform name strings include: `iOS`,
  `tvOS`, `macOS`, `Windows`, `Android`.
* `mainClass`: this is a named export (in CommonJS style) from your `main` field. It must be a
  class which extends Appium's `BaseDriver` (see below).

### Extend Appium's `BaseDriver` class

Ultimately, your driver is much easier to write because most of the hard work of implementing the
WebDriver protocol and handling certain common logic is taken care of already by Appium. This is
all encoded up as a class which Appium exports for you to use, called `BaseDriver`. It is exported
from `appium/driver`, so you can use one of these styles to import it and create your *own* class
that extends it:

```js
import {BaseDriver} from 'appium/driver';
// or: const {BaseDriver} = require('appium/driver');

export class MyDriver extends BaseDriver {
}
```

### Make your driver available

That's basically it! With a Node.js package exporting a driver class and with correct Appium
extension metadata, you've got yourself an Appium driver! Now it doesn't *do* anything, but you can
load it up in Appium, start and stop sessions with it, etc...

To make it available to users, you could publish it via NPM. When you do so, your driver will be
installable via the Appium CLI:

```
appium driver install --source=npm <driver-package-on-npm>
```

It's a good idea to test your driver first, of course. One way to see how it works within Appium is
to install it locally first:

```
appium driver install --source=local /path/to/your/driver
```

### Developing your driver

How you develop your driver is up to you. It is convenient, however, to run it from within Appium
without having to do lots of publishing and installing. The most straightforward way to do this is
to include the most recent version of Appium as a `devDependency`, and then also your own driver,
like this:

```json
{
    "devDependencies": {
        ...,
        "appium": "^2.0.0",
        "your-driver": "file:.",
        ...
    }
}
```

Now, you can run Appium locally (`npm exec appium` or `npx appium`), and because your driver is
listed as a dependency alongside it, it will be automatically "installed" and available. You can
design your e2e tests this way, or if you're writing them in Node.js, you can simply import
Appium's start server methods to handle starting and stopping the Appium server in Node. (TODO:
reference an implementation of this in one of the open source drivers when ready).

Another way to do local development with an existing Appium server install is to simply install
your driver locally:

```
appium driver install --source=local /path/to/your/driver/dev/dir
```

## Standard driver implementation ideas

These are things you will probably find yourself wanting to do when creating a driver.

### Set up state in a constructor

If you define your own constructor, you'll need to call `super` to make sure all the standard state
is set up correctly:

```js
constructor(args) {
    super(args);
    // now do your own thing
}
```

The `args` parameter here is the object containing all the CLI args used to start the Appium
server.

### Define and validate accepted capabilities

You can define your own capabilities and basic validation for them. Users will always be able to
send in capabilities that you don't define, but if they send in capabilities you have explicitly
defined, then Appium will validate that they are of the correct type (and will check for the
presence of required capabilities).

If you want to turn capability validation off entirely, set `this.shouldValidateCaps` to `false` in
your constructor.

To give Appium your validation constraints, set `this.desiredCapConstraints` to a validation object
in your constructor. Validation objects can be somewhat complex. Here's an example from the
UiAutomator2 driver:

```js
{
  app: {
    presence: true,
    isString: true
  },
  automationName: {
    isString: true
  },
  browserName: {
    isString: true
  },
  launchTimeout: {
    isNumber: true
  },
}
```

### Start a session and read capabilities

Appium's `BaseDriver` already implements the `createSession` command, so you don't have to. However
it's very common to need to perform your own startup actions (launching an app, running some
platform code, or doing different things based on capabilities you have defined for your driver).
So you'll probably end up overriding `createSession`. You can do so by defining the method in your
driver:

```js
async createSession(jwpCaps, reqCaps, w3cCaps, otherDriverData) {
    const [sessionId, caps] = super.createSession(w3cCaps);
    // do your own stuff here
    return [sessionId, caps];
}
```

For legacy reasons, your function will receive old-style JSON Wire Protocol desired and required
caps as the first two arguments. Given that the old protocol isn't supported anymore and clients
have all been updated, you can instead only rely on the `w3cCaps` parameter. (For a discussion
about what `otherDriverData` is about, see the section below on concurrent drivers).

You'll want to make sure to call `super.createSession` in order to get the session ID as well as
the processed capabilities (note that capabilities are also set on `this.caps`; modifying `caps`
locally here would have no effect other than changing what the user sees in the create session
response).

So that's it! You can fill out the middle section with whatever startup logic your driver requires.

### End a session

If your driver requires any cleanup or shutdown logic, it's best to do it as part of overriding the
implementation of `deleteSession`:

```js
async deleteSession() {
    // do your own cleanup here
    // don't forget to call super!
    await super.deleteSession();
}
```

It's very important not to throw any errors here if possible so that all parts of session cleanup
can succeed!

### Access capabilities and CLI args

You'll often want to read parameters the user has set for the session, whether as CLI args or as
capabilities. The easiest way to do this is to access `this.opts`, which is a merge of all options,
from the CLI or from capabilities. So for example to access the `appium:app` capability, you could
simply get the value of `this.opts.app`.

If you care about knowing whether something was sent in as a CLI arg *or* a capability, you can
access the `this.cliArgs` and `this.caps` objects explicitly.

In all cases, the `appium:` capability prefix will have been stripped away by the time you are
accessing values here, for convenience.

### Implement WebDriver commands

You handle WebDriver commands by implementing functions in your driver class. Each member of the
WebDriver Protocol, plus the various Appium extensions, has a corresponding function that you
implement if you want to support that command in your driver. The best way to see which commands
Appium supports and which method you need to implement for each command is to look at Appium's
[routes.js](https://github.com/appium/appium/blob/2.0/packages/base-driver/lib/protocol/routes.js).
Each route object in this file tells you the command name as well as the parameters you'd expect to
receive for that command.

Let's take this block for example:
```js
'/session/:sessionId/url': {
    GET: {command: 'getUrl'},
    POST: {command: 'setUrl', payloadParams: {required: ['url']}},
}
```

Here we see that the route `/session/:sessionId/url` is mapped to two commands, one for a `GET`
request and one for a `POST` request. If we want to allow our driver to change the "url" (or
whatever that might mean for our driver), we can therefore implement the `setUrl` command, knowing
it will take the `url` parameter:

```js
async setUrl(url) {
    // your implementation here
}
```

A few notes:
- all command methods should be `async` functions or otherwise return a `Promise`
- you don't need to worry about protocol encoding/decoding. You will get JS objects as params, and
  can return JSON-serializable objects in response. Appium will take care of wrapping it up in the
  WebDriver protocol response format, turning it into JSON, etc...
- all session-based commands receive the `sessionId` parameter as the last parameter
- all element-based commands receive the `elementId` parameter as the second-to-last parameter
- if your driver doesn't implement a command, users can still try to access the command, and will
  get a `501 Not Yet Implemented` response error.

### Implement element finding

Element finding is a special command implementation case. You don't actually want to override
`findElement` or `findElements`, even though those are what are listed in `routes.js`. Appium does
a lot of work for you if instead you implement this function:

```js
async findElOrEls(strategy, selector, mult, context) {
    // find your element here
}
```

Here's what gets passed in:

- `strategy` - a string, the locator strategy being used
- `selector` - a string, the selector
- `mult` - boolean, whether the user has requested one element or all elements matching the
  selector
- `context` - (optional) if defined, will be a W3C Element (i.e., a JS object with the W3C element
  identifier as the key and the element ID as the value)

And you need to return one of the following:

- a single W3C element (an object as described above)
- an array of W3C elements

Note that you can import that W3C web element identifier from `appium/support`:

```js
import {util} from 'appium/support';
const { W3C_WEB_ELEMENT_IDENTIFIER } = util;
```

What you do with elements is up to you! Usually you end up keeping a cache map of IDs to actual
element "objects" or whatever the equivalent is for your platform.

### Define valid locator strategies

Your driver might only support a subset of the standard WebDriver locator strategies, or it might
add its own custom locator strategies. To tell Appium which strategies are considered valid for
your driver, create an array of strategies and assign it to `this.locatorStrategies`:

```js
this.locatorStrategies = ['xpath', 'custom-strategy'];
```

Appium will throw an error if the user attempts to use any strategies other than the allowed ones,
which enables you to keep your element finding code clean and deal with only the strategies you
know about.

By default, the list of valid strategies is empty, so if your driver isn't simply proxying to
another WebDriver endpoint, you'll need to define some. The protocol-standard locator strategies
are defined [here](https://www.w3.org/TR/webdriver/#locator-strategies).

### Throw WebDriver-specific errors

The WebDriver spec defines a [set of error
codes](https://github.com/jlipps/simple-wd-spec#error-codes) to accompany command responses if an
error occurred. Appium has created error classes for each of these codes, so you can throw the
appropriate error from inside a command, and it will do the right thing in terms of the protocol
response to the user. To get access to these error classes, import them from `appium/driver`:

```
import {errors} from 'appium/driver';

throw new errors.NoSuchElementError();
```

### Log messages to the Appium log

You can always use `console.log`, of course, but Appium provides a nice logger for you as
`this.log` (it has `.info`, `.debug`, `.log`, `.warn`, `.error` methods on it for differing log
levels). If you want to create an Appium logger outside of a driver context (say in a script or
helper file), you can always construct your own too:

```js
import {logging} from 'appium/support';
const log = logging.getLogger('MyDriver');
```

## Further possibilities for Appium drivers

These are things your driver *can* do to take advantage of extra driver features or do its job more
conveniently.

### Add a schema for custom command line arguments

You can add custom CLI args if you want your driver to receive data from the command line when the
Appium server is started (for example, ports that a server administrator should set that should not
be passed in as capabilities.

To define CLI arguments (or configuration properties) for the Appium server, your extension must provide a _schema_. In
the `appium` property of your extension's `package.json`, add a `schema` property. This will either
a) be a schema itself, or b) be a path to a schema file.

The rules for these schemas:

- Schemas must conform to [JSON Schema Draft-07](https://ajv.js.org/json-schema.html#draft-07).
- Schemas must be in JSON or JS (CommonJS) format.
- Custom `$id` values are unsupported. To use `$ref`, provide a value relative to the schema root, e.g., `/properties/foo`.
- Known values of the `format` keyword are likely supported, but various other keywords may be unsupported. If you find a keyword that is unsupported which you need to use, please [ask for support](https://github.com/appium/appium/issues/new) or send a PR!
- The schema must be of type `object` (`{"type": "object"}`), containing the arguments in a `properties` keyword. Nested properties are unsupported.

Example:

```json
{
  "type": "object",
  "properties": {
    "test-web-server-port": {
      "type": "integer",
      "minimum": 1,
      "maximum": 65535,
      "description": "The port to use for the test web server"
    },
    "test-web-server-host": {
      "type": "string",
      "description": "The host to use for the test web server",
      "default": "sillyhost"
    }
  }
}
```

The above schema defines two properties which can be set via CLI argument or configuration file. If
this extension is a _driver_ and its name is "horace", the CLI args would be
`--driver-horace-test-web-server-port` and `--driver-horace-test-web-server-host`, respectively.
Alternatively, a user could provide a configuration file containing:

```json
{
  "server": {
    "driver": {
      "horace": {
        "test-web-server-port": 1234,
        "test-web-server-host": "localhorse"
      }
    }
  }
}
```

### Add driver scripts

Sometimes you might want users of your driver to be able to run scripts outside the context of
a session (for example, to run a script that pre-builds aspects of your driver). To support this,
you can add a map of script names and JS files to the `scripts` field within your Appium extension
metadata. So let's say you've created a script in your project that lives in a `scripts` directory
in your project, named `driver-prebuild.js`. Then you could add a `scripts` field like this:

```json
{
    "scripts": {
        "prebuild": "./scripts/driver-prebuild.js"
    }
}
```

Now, assuming your driver is named `mydriver`, users of your driver can run `appium driver run
mydriver prebuild`, and your script will execute.

### Proxy commands to another WebDriver implementation

A very common design architecture for Appium drivers is to have some kind of platform-specific
WebDriver implementation that the Appium driver interfaces with. For example, the Appium
UiAutomator2 driver interfaces with a special (Java-based) server running on the Android device. In
webview mode, it also interfaces with Chromedriver.

If you find yourself in this situation, it is extremely easy to tell Appium that your driver is
just going to be proxying WebDriver commands straight to another endpoint.

First, let Appium know that your driver *can* proxy by implementing the `canProxy` method:

```js
canProxy() {
    return true;
}
```

Next, tell Appium which WebDriver routes it should *not* attempt to proxy (there often end up being
certain routes that you don't want to forward on):

```js
getProxyAvoidList() {
    return [
        ['POST', new RegExp('^/session/[^/]+/appium')]
    ];
}
```

The proxy avoidance list should be an array of arrays, where each inner array has an HTTP method as
its first member, and a regular expression as its second. If the regular expression matches the
route, then the route will not be proxied and instead will be handled by your driver. In this
example, we are avoiding proxying all `POST` routes that have the `appium` prefix.

Next, we have to set up the proxying itself. The way to do this is to use a special class from
Appium called `JWProxy`. (The name means "JSON Wire Proxy" and is related to a legacy
implementation of the protocol). You'll want to create a `JWProxy` object using the details required to
connect to the remote server:

```js
// import {JWProxy} from 'appium/driver';

const proxy = new JWProxy({
    server: 'remote.server',
    port: 1234,
    base: '/',
});

this.proxyReqRes = proxy.proxyReqRes.bind(proxy);
this.proxyCommand = proxy.command.bind(proxy);
```

Here we are creating a proxy object and assigning some of its methods to `this` under the names
`proxyReqRes` and `proxyCommand`. This is required for Appium to use the proxy, so don't forget
this step! The `JWProxy` has a variety of other options which you can check out in the source code,
as well. (TODO: publish options as API docs and link here).

Finally, we need a way to tell Appium when the proxy is active. For your driver it might always
be active, or it might only be active when in a certain context. You can define the logic as an
implementation of `proxyActive`:

```js
proxyActive() {
    return true; // or use custom logic
}
```

With those pieces in play, you won't have to reimplement anything that's already implemented by the
remote endpoint you're proxying to. Appium will take care of all the proxying for you.

### Extend the existing protocol with new commands

You may find that the existing commands don't cut it for your driver. If you want to expose
behaviours that don't map to any of the existing commands, you can create new commands in one of
two ways:

1. Extending the WebDriver protocol and creating client-side plugins to access the extensions
1. Overloading the Execute Script command

If you want to follow the first path, you can direct Appium to recognize new methods and add them
to its set of allowed HTTP routes and command names. You do this by assigning the `newMethodMap`
static variable in your driver class to an object of the same form as Appium's `routes.js` object.
For example, here is the `newMethodMap` for the `FakeDriver` example driver:

```js
static newMethodMap = {
  '/session/:sessionId/fakedriver': {
    GET: {command: 'getFakeThing'},
    POST: {command: 'setFakeThing', payloadParams: {required: ['thing']}},
  },
  '/session/:sessionId/fakedriverargs': {
    GET: {command: 'getFakeDriverArgs'},
  },
};
```

In this example we're adding a few new routes and a total of 3 new commands. For more examples of
how to define commands in this way, it's best to have a look through `routes.js`. Now all you need
to do is implement the command handlers in the same way you'd implement any other Appium command.

The downside of this way of adding new commands is that people using the standard Appium clients
won't have nice client-side functions designed to target these endpoints. So you would need to
create and release client-side plugins for each language you want to support (directions or
examples can be found at the relevant client docs).

An alternative to this way of doing things is to overload a command which all WebDriver clients
have access to already: Execute Script. A common driver pattern is to create a magic prefix which
the driver looks for at the beginning of any Execute Script invocation, and if it's present, to
treat the rest of the script string as the name of a custom command to execute. This works in large
part because for most platforms beyond web browsers, executing arbitrary JavaScript isn't a thing
that makes sense.

Let's say you are building a driver for stereo system called `soundz`, and you wanted to create
a command for playing a song by name. You could expose this to your users in such a way that they
call something like:

```js
// webdriverio example
driver.executeScript('soundz: playSong', [{song: 'Stairway to Heaven', artist: 'Led Zeppelin'}]);
```

Then in your driver code you could simply look for `soundz:` at the beginning of your
`execute` override, and do the appropriate thing:

```js
async execute(script, args) {
  if (script === 'soundz: playSong') {
    const {song, artist} = args[0];
    // play the song based on song and artist details
    return;
  }

  // otherwise do the normal thing, or throw errors.NotYetImplementedError if you have nothing to
  // do (see the section on WebDriver errors in this guide)
}
```

### Implement handling of Appium settings

Appium users can send parameters to your driver via CLI args as well as via capabilities. But these
cannot change during the course of a test, and sometimes users want to adjust parameters mid-test.
Appium has a [Settings](../guides/settings.md) API for this purpose.

To support settings in your own driver, first of all define `this.settings` to be an instance of
the appropriate class, in your constructor:

```js
// import {DeviceSettings} from 'appium/driver';

this.settings = new DeviceSettings();
```

Now, you can read user settings any time simply by calling `this.settings.getSettings()`. This will
return a JS object where the settings names are keys and have their corresponding values.

If you want to assign some default settings, or run some code on your end whenever settings are
updated, you can do both of these things as well.

```js
constructor() {
  const defaults = {setting1: 'value1'};
  this.settings = new DeviceSettings(defaults, this.onSettingsUpdate.bind(this));
}

async onSettingsUpdate(key, value) {
  // do anything you want here with key and value
}
```

### Make itself aware of resources other concurrent drivers are using

Let's say your driver uses up some system resources, like ports. There are a few ways to make sure
that multiple simultaneous sessions don't use the same resources:

1. Have your users specify resource IDs via capabilities (`appium:driverPort` etc)
1. Just always use free resources (find a new random port for each session)
1. Have each driver express what resources it is using, then examine currently-used resources from
   other drivers when a new session begins.

To support this third strategy, you can implement `get driverData` in your driver to return what
sorts of resources your driver is currently using, for example:

```js
get driverData() {
  return {specialPort: 1234, specialFile: /path/to/file}
}
```

Now, when a new session is started on your driver, the `driverData` response from any other
simultaneously running drivers (of the same type) will also be included, as the last parameter of
the `createSession` method:

```js
async createSession(jwpCaps, reqCaps, w3cCaps, driverData)
```

You can dig into this `driverData` array to see what resources other drivers are using to help
determine which ones you want to use for this particular session.

!!! warning

    Be careful here, since `driverData` is only passed between sessions of a single running Appium
    server. There's nothing to stop a user from running multiple Appium servers and requesting your
    driver simultaneously on each of them. In this case, you won't be able to ensure independence
    of resources via `driverData`, so you might consider using file-based locking mechanisms or
    something similar.

!!! warning

    It's also important to note you will only receive `driverData` for other instances of *your*
    driver. So unrelated drivers also running may still be using some system resources. In general
    Appium doesn't provide any features for ensuring unrelated drivers don't interfere with one
    another, so it's up to the drivers to allow users to specify resource locations or addresses to
    avoid clashes.

### Log events to the Appium event timeline

Appium has an [Event Timing API](../guides/event-timing.md) which allows users to get timestamps
for certain server-side events (like commands, startup milestones, etc...) and display them on
a timeline. The feature basically exists to allow introspection of timing for internal events to
help with debugging or running analysis on Appium driver internals. You can add your own events to
the event log:

```js
this.logEvent(name);
```

Simply provide a name for the event and it will be added at the current time, and made accessible
as part of the event log for users.

### Hide behaviour behind security flags

Appium has a feature-flag based [security model](../guides/security.md) that allows driver authors
to hide certain features behind security flags. What this means is that if you have a feature you
deem insecure and want to require server admins to opt in to it, you can require that they enable
the feature by adding it to the `--allow-insecure` list or turning off server security entirely.

To support the check within your own driver, you can call `this.isFeatureEnabled(featureName)` to
determine whether a feature of the given name has been enabled. Or, if you want to simply
short-circuit and throw an error if the feature isn't enabled, you can call
`this.assertFeatureEnabled(featureName)`.

### Use a temp dir for files

If you want to use a temporary directory for files your driver creates that are not important to
keep around between computer or server restarts, you can simply read from `this.opts.tmpDir`. This
reads the temporary directory location from `@appium/support`, potentially overridden by a CLI
flag. I.e., it's safer than writing to your own temporary directory because the location here plays
nicely with possible user configuration. `this.opts.tmpDir` is a string, the path to the dir.

### Deal with unexpected shutdowns or crashes

Your driver might run into a situation where it can't continue operating normally. For example, it
might detect that some external service has crashed and nothing will work anymore. In this case, it
can call `this.startUnexpectedShutdown(err)` with an error object including any details, and Appium
will attempt to gracefully handle any remaining requests before shutting down the session.

If you want to perform some of your own cleanup logic when you encounter this condition, you can
either do so immediately before calling `this.startUnexpectedShutdown`, or you can attach a handler
to the unexpected shutdown event and run your cleanup logic "out of band" so to speak:

```js
this.onUnexpectedShutdown(handler)
```

`handler` should be a function which receives an error object (representing the reason for the
unexpected shutdown).
