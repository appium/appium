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
appium --plugins=cool-plugin
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

You probably don't normally need to update the Appium server object (which is an Express server having already been configured in a variety of ways). But, for example, you could add new Express middleware to the server to support your plugin's requirements. To update the server you must do two things:

1. Set the class variable `updatesServer` to `true`, so that Appium knows your plugin needs to update the server before launch.
1. Implement the `async updateServer` method in your class. This method takes two parameters, `expressApp` and `httpServer`, which are the Express app object and the Node HTTP server object respectively. You can do whatever you want with them inside the `updateServer` method.

### Handling Appium commands

This is the most normal behavior for Appium plugins -- to modify or replace the execution of one or more commands. There are two things you must do to override the default command handling:

1. Set the `commands` class variable to either `true` (meaning all commands will be handled by this plugin), or to an array of command names, signifying that your plugin should only handle those particular command names. Curious what command names there are? They are defined in the Appium base driver's [routes.js](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js) file.
1. Implement the `async handle` method. Whatever you return from this method will be what is sent back to the Appium client for the particular command being handled. This method is sent the following arguments:
  1. `next`: This is an async method which encapsulates the chain of behaviors which would take place if this plugin were not handling the command. You can choose to call it (`await next()`), or not. If you don't, it means the normal behavior (or any plugins registered after this one) won't be run.
  1. `driver`: This is the object representing the driver handling the current session. You have access to it for any work you need to do.
  1. `cmdName`: A string representing the current command being handled (if your plugin handles multiple commands, you can use this to figure out which internal behavior to run).
  1. `...args`: A spread array with any arguments that have been applied to the command by the user.

### Adding new routes/commands

You might decide that you want to add some new routes or commands to the Appium server, which could be called by clients. To do this, you should assign the `newMethodMap` class variable to an object containing a set of routes and command names and arguments. The format of this object should exactly match the format of the `METHOD_MAP` object in Appium's [routes definition](https://github.com/appium/appium-base-driver/blob/master/lib/protocol/routes.js). Of course, just adding commands here does not implement them: you will also need to check for any new command names in your `handle` method to handle them, since by default there will be no implementation of commands added via `newMethodMap`.

## Tips

All of this is a lot to digest, and it's often easier to have a look at examples. The various plugins inside this monorepo are a good way to get familiar with what plugins can do!
