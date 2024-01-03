---
title: Building Plugins
---

This is a high-level guide for developing Appium plugins, which is not something most Appium users
need to know or care about. If you are not familiar with Appium plugins yet from a user
perspective, check out the [list of plugins](../ecosystem/plugins.md) to play around with some and get
an idea of the sorts of things that plugins can do. Plugins are a powerful system for augmenting
Appium's functionality or changing the way Appium works. They can be distributed to other Appium
users and can extend Appium's ecosystem in all kinds of interesting ways! (There is also
a significant amount of overlap here with developing Appium drivers, so you may also want to check
out the [building drivers](./build-drivers.md) guide for further inspiration.)

## Before you create your plugin

Before creating your plugin, it's good to have a general idea of what you want your plugin to
accomplish and whether it will be possible to implement it given the restrictions of the Appium
platform. Reading through this guide will help you understand what's possible. In general, Appium's
plugin system is extremely powerful and no attempts have been made to artificially limit what's
possible with them (which is a main reason that all plugins are opt-in by the system administrator
responsible for starting the Appium server---plugins are powerful and should only be used when
explicitly trusted!).

## Other plugins to reference

There are a wide variety of open source Appium plugins available for perusal. It's definitely
recommended to explore the code for some other plugins before embarking on writing your own. The
Appium team maintains a set of official plugins in the [Appium GitHub
repo](https://github.com/appium/appium). Links to other open source plugins can be found in the
[Plugin list](../ecosystem/plugins.md)

## Basic requirements for plugins

These are the things your plugin *must* do (or be), if you want it to be a valid Appium plugin.

### Node.js package with Appium extension metadata

All Appium plugins are fundamentally Node.js packages, and therefore must have a valid
`package.json`. Your driver is not _limited_ to Node.js, but it must provide an adapter written in
Node.js so it can be loaded by Appium.

Your `package.json` must include `appium` as a `peerDependency`. The requirements for the
dependency versions should be as loose as possible (unless you happen to know your plugin will only
work with certain versions of Appium). For Appium 2, for example, this would look something like
`^2.0.0`, declaring that your plugin works with any version of Appium that starts with 2.x.

Your `package.json` must contain an `appium` field, like this (we call this the 'Appium extension
metadata'):

    ```json
    {
      ...,
      "appium": {
        "pluginName": "fake",
        "mainClass": "FakePlugin"
      },
      ...
    }
    ```

The required subfields are:

* `pluginName`: this should be a short name for your plugin.
* `mainClass`: this is a named export (in CommonJS style) from your `main` field. It must be a
  class which extends Appium's `BasePlugin` (see below).

### Extend Appium's `BasePlugin` class

Ultimately, your plugin is much easier to write because most of the hard work of defining patterns
for overriding commands is done for you. This is
all encoded up as a class which Appium exports for you to use, called `BasePlugin`. It is exported
from `appium/plugin`, so you can use one of these styles to import it and create your *own* class
that extends it:

```js
import {BasePlugin} from 'appium/plugin';
// or: const {BasePlugin} = require('appium/plugin');

export class MyPlugin extends BasePlugin {
  // class methods here
}
```

!!! note

    In all the code samples below, whenever we reference an example method, it is assumed
    that it is defined _within_ the class, though this is not explicitly written, for the sake of
    clarity and space.

### Make your plugin available

That's basically it! With a Node.js package exporting a plugin class and with correct Appium
extension metadata, you've got yourself an Appium plugin! Now it doesn't *do* anything, but you can
load it up in Appium, activate it, etc...

To make it available to users, you could publish it via NPM. When you do so, your plugin will be
installable via the Appium CLI:

```
appium plugin install --source=npm <plugin-package-on-npm>
```

It's a good idea to test your plugin first, of course. One way to see how it works within Appium is
to install it locally first:

```
appium plugin install --source=local /path/to/your/plugin
```

And of course, plugins must be "activated" during Appium server start, so make sure you direct your
users to do so:

```
appium --use-plugins=plugin-name
```

### Developing your plugin

How you develop your plugin is up to you. It is convenient, however, to run it from within Appium
without having to do lots of publishing and installing. The most straightforward way to do this is
to include the most recent version of Appium as a `devDependency` (although its being already
included as a `peerDependency` is sufficient in newer versions of NPM), and then also your own plugin,
like this:

```json
{
    "devDependencies": {
        ...,
        "appium": "^2.0.0",
        "your-plugin": "file:.",
        ...
    }
}
```

Now, you can run Appium locally (`npm exec appium` or `npx appium`), and because your plugin is
listed as a dependency alongside it, it will be automatically "installed" and available. You can
design your e2e tests this way, or if you're writing them in Node.js, you can simply import
Appium's start server methods to handle starting and stopping the Appium server in Node.

Of course, you can always install it locally as described above as well.

Anytime you make changes to your plugin code, you'll need to restart the Appium server to make sure
it picks up the latest code. As with drivers, you can set the `APPIUM_RELOAD_EXTENSIONS`
environment variable if you wish Appium to try to re-require your plugin module when a new session
starts.

## Standard plugin implementation ideas

These are things you will probably find yourself wanting to do when creating a plugin.

### Set up state in a constructor

If you define your own constructor, you'll need to call `super` to make sure all the standard state
is set up correctly:

```js
constructor(...args) {
    super(...args);
    // now do your own thing
}
```

The `args` parameter here is the object containing all the CLI args used to start the Appium
server.

### Intercept and handle specific Appium commands

This is the most normal behavior for Appium plugins -- to modify or replace the execution of one or
more commands that would normally be handled by the active driver. To override the default command
handling, you need to implement `async` methods in your class with the same name as the Appium
commands to be handled (just exactly how [drivers themselves are
implemented](./build-drivers.md#implement-webdriver-commands)). Curious what command names there
are? They are defined in the Appium base driver's
[routes.js](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js) file,
and of course you can add more as defined in the next section.

Each command method is sent the following arguments:

1. `next`: This is a reference to an `async` function which encapsulates the chain of behaviors which would take place if this plugin were not handling the command. You can choose to call the next behavior in the chain at any point in your logic (by making sure to include `await next()` somewhere), or not. If you don't, it means the default behavior (or any plugins registered after this one) won't be run.
1. `driver`: This is the object representing the driver handling the current session. You have access to it for any work you need to do, for example calling other driver methods, checking capabilities or settings, etc...
1. `...args`: A spread array with any arguments that have been applied to the command by the user.

For example, if we wanted to override the `setUrl` command to simply add some extra logging on top,
we would implement as follows:

```js
async setUrl(next, driver, url) {
  this.log(`Let's get the page source for some reason before navigating to '${url}'!`);
  await driver.getPageSource();
  const result = await next();
  this.log(`We can also log after the original behaviour`);
  return result;
}
```

### Intercept and handle _all_ Appium commands

You might find yourself in a position where you want to handle *all* commands, in order to inspect
payloads to determine whether or not to act in some way. If so, you can implement `async handle`,
and any command that is not handled by one of your named methods will be handled by this method
instead. It takes the following parameters (with all the same semantics as above):

1. `next`
1. `driver`
1. `cmdName` - string representing the command being run
1. `...args`

For example, let's say we want to log timing for all Appium commands as part of a plugin. We could
do this by implementing `handle` in our plugin class as follows:

```js
async handle(next, driver, cmdName, ...args) {
  const start = Date.now();
  try {
    const result = await next();
  } finally {
    const elapsedMs = Date.now() - start;
    this.log(`Command '${cmdName}' took ${elapsedMs}`);
  }
  return result;
}
```

### Work around driver proxies

There is a bit of a gotcha with handling Appium commands. Appium drivers have the ability to turn
on a special 'proxy' mode, wherein the Appium server process takes a look at incoming URLs, and
decides whether to forward them on to some upstream WebDriver server. It could happen that
a command which a plugin wants to handle is designated as a command which is being proxied to an
upstream server. In this case, we run into a problem, because the plugin never gets a chance to
handle that command! For this reason, plugins can implement a special member function called
`shouldAvoidProxy`, which takes the following parameters:

1. `method` - string denoting HTTP method (`GET`, `POST`, etc...)
2. `route` - string denoting the requested resource, for example `/session/8b3d9aa8-a0ca-47b9-9ab7-446e818ec4fc/source`
3. `body` - optional value of any type representing the WebDriver request body

These parameters define an incoming request. If you want to handle a command in your plugin which
would normally be proxied directly through a driver, you could disable or 'avoid' proxying the
request, and instead have the request fall into the typical Appium command execution flow (and
thereby your own command function). To avoid proxying a request, just return `true` from
`shouldAvoidProxy`. Some examples of how this method is used are in the [Universal XML
plugin](https://github.com/appium/appium/blob/master/packages/universal-xml/lib/plugin.js) (where
we want to avoid proxying the `getPageSource` command, or in the [Images
plugin](https://github.com/appium/appium/blob/master/packages/images-plugin/lib/plugin.js) (where
we want to conditionally avoid proxying any command if it looks like it contains an image element).


### Throw WebDriver-specific errors

The WebDriver spec defines a [set of error
codes](https://github.com/jlipps/simple-wd-spec#error-codes) to accompany command responses if an
error occurred. Appium has created error classes for each of these codes, so you can throw the
appropriate error from inside a command, and it will do the right thing in terms of the protocol
response to the user. To get access to these error classes, import them from `appium/driver`:

```js
import {errors} from 'appium/driver';

throw new errors.NoSuchElementError();
```

### Log messages to the Appium log

You can always use `console.log`, of course, but Appium provides a nice logger for you as
`this.logger` (it has `.info`, `.debug`, `.log`, `.warn`, `.error` methods on it for differing log
levels). If you want to create an Appium logger outside of a plugin context (say in a script or
helper file), you can always construct your own too:

```js
import {logging} from 'appium/support';
const log = logging.getLogger('MyPlugin');
```

## Further possibilities for Appium plugins

These are things your plugin *can* do to take advantage of extra plugin features or do its job more
conveniently.

### Add a schema for custom command line arguments

You can add custom CLI args if you want your plugin to receive data from the command line when the
Appium server is started (for example, ports that a server administrator should set that should not
be passed in as capabilities).

This works largely the same for plugins as it does for drivers, so for more details have a look at
[the equivalent section in the building drivers
doc](./build-drivers.md#add-a-schema-for-custom-command-line-arguments).

The only difference is that to construct the CLI argument name, you prefix it with
`--plugin-<name>`. So for example, if you have a plugin named `pluggo` and a CLI arg defined with
the name `electro-port`, you can set it when starting Appium via `--plugin-pluggo-electro-port`.

Setting args via a configuration file is also supported, as it is for drivers, but under the
`plugin` field instead. For example:

```json
{
  "server": {
    "plugin": {
      "pluggo": {
        "electro-port": 1234
      }
    }
  }
}
```

### Add plugin scripts

Sometimes you might want users of your plugin to be able to run scripts outside the context of
a session (for example, to run a script that pre-builds aspects of your plugin). To support this,
you can add a map of script names and JS files to the `scripts` field within your Appium extension
metadata. So let's say you've created a script in your project that lives in a `scripts` directory
in your project, named `plugin-prebuild.js`. Then you could add a `scripts` field like this:

```json
{
    "scripts": {
        "prebuild": "./scripts/plugin-prebuild.js"
    }
}
```

Now, assuming your plugin is named `myplugin`, users of your plugin can run `appium plugin run
myplugin prebuild`, and your script will execute.

### Add new Appium commands

If you want to offer functionality that doesn't map to any of the existing commands supported by
drivers, you can create new commands in one of two ways, just as is possible for drivers:

1. Extending the WebDriver protocol and creating client-side plugins to access the extensions
1. Overloading the Execute Script command by defining [Execute
   Methods](../guides/execute-methods.md)

If you want to follow the first path, you can direct Appium to recognize new methods and add them
to its set of allowed HTTP routes and command names. You do this by assigning the `newMethodMap`
static variable in your driver class to an object of the same form as Appium's `routes.js` object.
For example, here is part of the `newMethodMap` for the `FakePlugin` example driver:

```js
static newMethodMap = {
  '/session/:sessionId/fake_data': {
    GET: {command: 'getFakeSessionData', neverProxy: true},
    POST: {
      command: 'setFakeSessionData',
      payloadParams: {required: ['data']},
      neverProxy: true,
    },
  },
  '/session/:sessionId/fakepluginargs': {
    GET: {command: 'getFakePluginArgs', neverProxy: true},
  },
};
```

!!! note

    If you're using TypeScript, static member objects like these should be defined `as const`.

In this example we're adding a few new routes and a total of 3 new commands. For more examples of
how to define commands in this way, it's best to have a look through `routes.js`. Now all you need
to do is implement the command handlers in the same way you'd implement any other Appium command.

Note also the special `neverProxy` key for commands; this is generally a good idea to set to `true`
for plugins, since your plugin might be active for a driver that is put into proxy mode but hasn't
bothered to decline proxying for these (new and therefore unknown) commands. Setting `neverProxy`
to `true` here will cause Appium to never proxy these routes and therefore ensure your plugin
handles them, even if a driver is in proxy mode.

The downside of adding new commands via `newMethodMap` is that people using the standard Appium
clients won't have nice client-side functions designed to target these endpoints. So you would need
to create and release client-side plugins for each language you want to support (directions or
examples can be found at the relevant client docs).

An alternative to this way of doing things is to overload a command which all WebDriver clients
have access to already: Execute Script. Make sure to read the section on [adding new
commands](./build-drivers.md#extend-the-existing-protocol-with-new-commands) in
the Building Drivers guide to understand the way this works in general. The way it works with
plugins is only slightly different. Let's look at an example taken from Appium's `fake-plugin`:

```js
static executeMethodMap = {
  'fake: plugMeIn': {
    command: 'plugMeIn',
    params: {required: ['socket']},
  },
};

async plugMeIn(next, driver, socket) {
  return `Plugged in to ${socket}`;
}

async execute(next, driver, script, args) {
  return await this.executeMethod(next, driver, script, args);
}
```

We have three important components shown here which make this system work, all of which are defined
inside the plugin class:

1. The `executeMethodMap`, defined in just the same way as for drivers
1. The implementation of the command method as defined in `executeMethodMap` (in this case,
   `plugMeIn`)
1. The overriding/handling of the `execute` command. Just like any plugin command handlers, the
first two arguments are `next` and `driver`, followed by the script name and args. `BasePlugin`
implements a helper method which we can simply call with all of these arguments.

Overriding Execute Methods from drivers works as you'd expect: if your plugin defines an Execute
Method with the same name as that of a driver, your command (in this case `plugMeIn`) will be
called first. You can choose to run the driver's original behaviour via `next` if you want.

### Build Appium Doctor checks

Your users can run `appium plugin doctor <pluginName>` to run installation and health checks. Visit
the [Building Doctor Checks](./build-doctor-checks.md) guide for more information on this
capability.

### Update the Appium server object

You probably don't normally need to update the Appium server object (which is an
[Express](https://expressjs.com/) server having already been
[configured](https://github.com/appium/appium/blob/master/packages/base-driver/lib/express/server.js)
in a variety of ways). But, for example, you could add new Express middleware to the server to
support your plugin's requirements. To update the server you must implement the `static async
updateServer` method in your class. This method takes three parameters:

* `expressApp`: the Express app object
* `httpServer`: the Node HTTP server object
* `cliArgs`: a map of the CLI args used to start the Appium server

You can do whatever you want with them inside the `updateServer` method. You might want to
reference how these objects are created and worked with in the BaseDriver code, so that you know
you're not undoing or overriding anything standard and important. But if you insist, you can, with
results you'll need to test! Warning: this should be considered an advanced feature and requires
knowledge of Express, as well as the care not to do anything that could affect the operation of
other parts of the Appium server!

### Handle unexpected session shutdown

When developing a plugin you may want to add some cleanup logic for when a session ends. You would
naturally do this by adding a handler for `deleteSession`. This works in most cases, except when
the session does not finish cleanly. Appium sometimes determines that a session has finished
unexpectedly, and in these situations, Appium will look for a method called `onUnexpectedShutdown`
in your plugin class, which will be called (passing the current session driver as the first
parameter, and the error object representing the cause of the shutdown as the second), giving you
an opportunity to take any steps that might be necessary to clean up from the session. For example,
keeping in mind that the function is not `await`ed you could implement something like this:

```js
async onUnexpectedShutdown(driver, cause) {
  try {
    // do some cleanup
  } catch (e) {
    // log any errors; don't allow anything to be thrown as they will be unhandled rejections
  }
}
```
