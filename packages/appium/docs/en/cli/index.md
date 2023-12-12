---
hide:
  - toc

title: CLI Intro
---

When you install Appium globally via `npm`, an executable shell script named `appium` is placed in
your global Node `bin` folder, often also symlinked to places like `/usr/local/bin`. If your `PATH`
is set up to look for programs in appropriate directory, then you will be able to run `appium` from
the command line of your terminal, like any other executable. The `appium` program has three main
subcommands, each of which has its own set of documentation:

1. The [`server`](./args.md) subcommand starts an Appium server listening for new session requests,
   and takes a variety of parameters related to the operation of the server and also those consumed
   by active drivers or plugins.
2. The [Extension](./extensions) (`driver` and `plugin`) subcommands assist in managing Appium
   drivers and plugins.
