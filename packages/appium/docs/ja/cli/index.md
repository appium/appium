---
hide:
  - toc

title: Command-Line Overview
---

Appium provides a command-line executable (`appium`), which will likely be your main way of interacting with
the Appium server. This section of the Appium documentation describes how to use this executable.

To start off, you can run `appium -v` or `appium --version` to return the installed version,
or run `appium -h` or `appium --help` to return the help message.

The main `appium` executable provides the following subcommands:

1. `appium server` (or simply `appium`) - launch an Appium server
  - [See here for accepted arguments](./args.md)
  - For advanced features, [see here for accepted environment variables](./env-vars.md)
2. `appium driver` - manage Appium drivers
  - [See here for details](./extensions.md)
3. `appium plugin` - manage Appium plugins
  - [See here for details](./extensions.md)
4. `appium setup` - batch install a preset of drivers and plugins
  - [See here for details](./setup.md)

Like the main command, you can also run each subcommand with the `-h` or `--help` flag to learn more about it.
