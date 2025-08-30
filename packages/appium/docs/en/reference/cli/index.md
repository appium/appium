---
hide:
  - toc

title: Command Line Interface
---

Appium provides a command-line executable (`appium`), which can be used to configure and launch
the Appium server, as well as manage drivers and plugins.

The executable has four main subcommands: `server`, `driver`, `plugin`, and `setup`.

<div class="grid cards" markdown>

-   [__`appium server`__](./server.md) (or simply `appium`)

    Start an Appium server

-   [__`appium driver`__](./extensions.md)

    Manage individual drivers

-   [__`appium plugin`__](./extensions.md)

    Manage individual plugins

-   [__`appium setup`__](./setup.md)

    Manage multiple drivers/plugins

</div>

Appium also recognizes several [environment variables](./env-vars.md), which may be used for
advanced configuration.
