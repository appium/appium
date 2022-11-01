---
title: CLI Intro
---

When you install Appium globally from NPM, an `appium` "binary" is placed in your global
`node_modules` folder. If your `PATH` is set up to look for programs in that folder, then you will
be able to run `appium` from the command line of your terminal. The `appium` program has two main
subcommands, each of which has its own set of documentation:

1. The [Server](./args.md) subcommand starts an Appium server listening for new session requests,
   and takes a variety of parameters related to the operation of the server and also those consumed
   by active drivers or plugins.
2. The [Extension](./extensions) subcommands assist in managing Appium drivers and plugins.
