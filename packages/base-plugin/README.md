# Appium Base Plugin

The base class used to create Appium plugins. This plugin should not be installed directly as it does nothing. Instead, you extend this plugin when creating your *own* Appium plugins.

## Steps to create your own plugin

You can follow this guide to create your own Appium plugin.

### 1. Initialize a Node.js project

Appium plugins are Node.js programs, though of course you can call out to any other language or framework you want in the course of executing Node.js code. The basic requirement for an Appium plugin is to add certain metadata fields in your project's `package.json`, for example:

```
{
  ...,
  "appium": {
    "pluginName": "your-plugin-name",
    "mainClass": "YourPlugin",
  },
  ...
}
```

Here the `pluginName` is the name used to activate your plugin by users who have installed it. So if your `pluginName` is `cool-plugin`, they would activate it as follows:

```
appium --use-plugins=cool-plugin
```

The same goes for updating and removing the plugin using the CLI.

The `mainClass` value is the name that Appium should import from your project's entrypoint. So for example if somewhere in your project you have defined your plugin as follows:

```
class CoolPlugin extends BasePlugin {
  ...
}
```

Then you need to make sure that Appium can import/require this name from your node package:

```
const { CoolPlugin } = require('someones-cool-plugin')
```

### 2. Create your Plugin class by extending BasePlugin

As implied above, your project should export a class which extends BasePlugin. This means you need to add BasePlugin as a project dependency:

```
npm install --save @appium/base-plugin
```

Then you can create a class which extends it:

```
import BasePlugin from '@appium/base-plugin'

class CoolPlugin extends BasePlugin {}
```

### 3. Implement your Plugin class

Your plugin can do one or more of 3 basic things:

1. Update the Appium server object before it starts listening for requests
1. Handle Appium commands in lieu of the driver which would normally handle them
1. Add new routes/commands to Appium (which your plugin must then handle)

#### Updating the server

You probably don't normally need to update the Appium server object (which is an Express server having already been configured in a variety of ways). But, for example, you could add new Express middleware to the server to support your plugin's requirements. To update the server you must implement the `static async updateServer` method in your class. This method takes two parameters:

* `expressApp`: the Express app object
* `httpServer`: the Node HTTP server object

You can do whatever you want with them inside the `updateServer` method. You might want to reference how these objects are created and worked with in the BaseDriver code, so that you know you're not undoing or overriding anything standard and important. But if you insist, you can, with results you'll need to test!

### Handling Appium commands

This is the most normal behavior for Appium plugins -- to modify or replace the execution of one or more commands. To override the default command handling, you need to implement `async` methods in your class with the same name as the Appium commands to be handled (just exactly how drivers themselves are implemented). Curious what command names there are? They are defined in the Appium base driver's [routes.js](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js) file, and of course you can add more as defined in the next section.

Each command method is sent the following arguments:

1. `next`: This is a reference to an `async` function which encapsulates the chain of behaviors which would take place if this plugin were not handling the command. You can choose to call the next behavior in the chain at any point in your logic (by making sure to include `await next()` somewhere), or not. If you don't, it means the default behavior (or any plugins registered after this one) won't be run.
1. `driver`: This is the object representing the driver handling the current session. You have access to it for any work you need to do, for example calling other driver methods, checking capabilities or settings, etc...
1. `...args`: A spread array with any arguments that have been applied to the command by the user.

You might find yourself in a position where you want to handle *all* commands, in order to inspect payloads to determine whether or not to act in some way. If so, you can implement `async handle`, and any command that is not handled by one of your named methods will be handled by this method instead. It takes the following parameters (with all the same semantics as above):

1. `next`
1. `driver`
1. `cmdName` - string representing the command being run
1. `...args`

There is a bit of a gotcha with handling Appium commands. Appium drivers have the ability to turn on a special 'proxy' mode, wherein the Appium server process takes a look at incoming URLs, and decides whether to forward them on to some upstream WebDriver server. It could happen that a command which a plugin wants to handle is designated as a command which is being proxied to an upstream server. In this case, we run into a problem, because the plugin never gets a chance to handle that command! For this reason, plugins can implement a special member function called `shouldAvoidProxy`, which takes the following parameters:

1. `method` - string denoting HTTP method (`GET`, `POST`, etc...)
2. `route` - string denoting the requested resource, for example `/session/8b3d9aa8-a0ca-47b9-9ab7-446e818ec4fc/source`
3. `body` - optional value of any type representing the WebDriver request body

These parameters define an incoming request. If you want to handle a command in your plugin which would normally be proxied directly through a driver, you could disable or 'avoid' proxying the request, and instead have the request fall into the typical Appium command execution flow (and thereby your own command function). To avoid proxying a request, just return `true` from `shouldAvoidProxy`. Some examples of how this method is used are in the [Universal XML plugin](../universal-xml/lib/plugin.js) (where we want to avoid proxying the `getPageSource` command, or in the [Images plugin](../images/lib/plugin.js) (where we want to conditionally avoid proxying any command if it looks like it contains an image element).

### Adding new routes/commands

You might decide that you want to add some new routes or commands to the Appium server, which could be called by clients. To do this, you should assign the static `newMethodMap` class variable to an object containing a set of routes and command names and arguments. The format of this object should exactly match the format of the `METHOD_MAP` object in Appium's [routes definition](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js). Of course, just adding commands here does not implement them: you will also need to check for any new command names in your `handle` method to handle them, since by default there will be no implementation of commands added via `newMethodMap`.

Note that the information about avoiding proxying above also applies to new commands that you've added. But to make life easy, instead of implementing `shouldAvoidProxy` for these cases, you can simply add the `neverProxy: true` field to your command specifier (see examples in the Fake Plugin class).

### Unexpected session shutdown

When developing a plugin you may want to add some cleanup logic by handling `deleteSession`. This works in most cases, except when the session does not finish cleanly. Appium sometimes determines that a session has finished unexpectedly, and in these situations, Appium will look for a method called `onUnexpectedShutdown` in your plugin class, which will be called (passing the current session driver as the first parameter, and the error object representing the cause of the shutdown as the second), giving you an opportunity to take any steps that might be necessary to clean up from the session. For example, keeping in mind that the function is not `await`ed you could implement something like this:

```js
async onUnexpectedShutdown(driver, cause) {
  try {
    // do some cleanup
  } catch (e) {
    // log any errors; don't allow anything to be thrown as they will be unhandled rejections
  }
}
```

## Tips

All of this is a lot to digest, and it's often easier to have a look at examples. The various plugins inside this monorepo are a good way to get familiar with what plugins can do!
