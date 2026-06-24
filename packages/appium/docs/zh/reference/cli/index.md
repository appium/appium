---
hide:
  - toc

title: Command Line Interface
---

Appium provides a command-line executable (`appium`), which can be used to configure and launch
the Appium server, as well as manage Appium extensions (drivers and plugins).

The executable has four main subcommands: `server`, `driver`, `plugin`, and `setup`. All subcommands
(and sub-subcommands) can be run with the `--help`/`-h` option for usage instructions.

<div class="grid cards" markdown>

- [**`appium server`**](./server.md) (or simply `appium`)

  Start an Appium server

- [**`appium driver`**](./extensions.md)

  Manage individual drivers

- [**`appium plugin`**](./extensions.md)

  Manage individual plugins

- [**`appium setup`**](./setup.md)

  Manage multiple drivers/plugins

</div>

The Appium server also recognizes several [environment variables](./env-vars.md) and
[insecure feature names](./insecure-features.md), though drivers and plugins can also define
variables and features of their own.
