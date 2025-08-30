---
title: Managing Drivers and Plugins
---

To do anything useful with Appium, you need to have at least one [Driver](../intro/drivers.md)
installed, otherwise Appium won't know how to automate anything. There is an entire
[Ecosystem](../ecosystem/index.md) of drivers and plugins out there!

This guide helps explain how to manage these drivers and plugins. There are
two basic strategies: using Appium's extension CLI interface, or managing extensions yourself in an
`npm`-based project.

!!! note

```
Other package managers are not currently supported.
```

## Using Appium's Extension CLI

With Appium's [Extension CLI](../reference/cli/extensions.md), you let Appium manage drivers and plugins for
you.  You will use CLI commands to tell Appium which extensions you would like to install, update,
or remove. Here's an example of how you might install a driver using the CLI:

```bash
appium driver install xcuitest
```

This command will install the latest version of the
[XCUITest Driver](https://github.com/appium/appium-xcuitest-driver). The Extension CLI comes with a variety
of commands and parameters; see the documentation for that command for all the specifics.

The all-important question when Appium is managing your extensions for you is: where are they installed?
Appium manages extensions in a directory specified by the `APPIUM_HOME` environment variable. You
can set that variable to anything you like, and Appium will manage its extensions there. You can
therefore also use the `APPIUM_HOME` environment variable to manage different sets of extensions,
for example if you want to have the same driver installed at conflicting versions:

```bash
APPIUM_HOME=/path/to/home1 appium driver install xcuitest@4.11.1
APPIUM_HOME=/path/to/home2 appium driver install xcuitest@4.11.2
```

Running these commands will result in two separate `APPIUM_HOME` directories being created and
populated with the corresponding version of the XCUITest driver. You can then use the same
environment variables to direct Appium which version to use on launch:

```bash
APPIUM_HOME=/path/to/home1 appium  # use xcuitest driver 4.11.1
APPIUM_HOME=/path/to/home2 appium  # use xcuitest driver 4.11.2
```

You don't need to set `APPIUM_HOME` if you don't want to! By default, Appium will set `APPIUM_HOME`
to the directory `.appium` in your user home directory.

These installed packages will be managed by `extensions.yaml` in `$APPIUM_HOME/node_modules/.cache/appium/extensions.yaml`.

## Do-It-Yourself with `npm`

Because Appium and Appium drivers are Node.js programs, if you are integrating your Appium scripts
into your own Node.js project, there is an alternative way to manage drivers and plugins: via `npm`,
like any other dependency. Basically, whenever you run Appium, if you have not explicitly set
`APPIUM_HOME`, it will:

1. Try to determine whether the _current directory_ is inside an `npm` package.
2. If so, it will check whether `appium` is a dependency (dev, prod, or peer) in the project's
   `package.json`
3. If so, _unless you have specified `APPIUM_HOME` in your environment_, Appium will ignore load
   drivers and plugins defined in that `package.json` file instead.

This means you are freely able to add Appium drivers and plugins as regular package dependencies or
dev dependencies. For example, if your project has a `package.json` which includes the following:

```json
{
  "devDependencies": {
    "appium": "^2.0.0",
    "appium-xcuitest-driver": "^4.11.1"
  }
}
```

Then, if you run `npx appium` inside your project, Appium will detect that it is a dependency of
the project, and will load the XCUITest driver which is also listed as a dev dependency for the
project.

This strategy is _only_ recommended if you are already using `npm` for your project.
Otherwise, it is recommended that you use Appium's Extension CLI and, if necessary, adjust
`APPIUM_HOME` to change the location of stored extensions.
