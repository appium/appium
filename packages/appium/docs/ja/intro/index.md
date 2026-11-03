---
hide:
  - toc

title: Appium in a Nutshell
---

As mentioned on the main page, Appium aims to support UI automation of many _different platforms_
(mobile, web, desktop, etc.). Not only that, but it also aims to support automation code written in
_different languages_ (JS, Java, Python, etc.). Combining all of this functionality in a single
program is a very daunting, if not impossible task!

In order to achieve this, Appium is effectively split into four parts:

<div class="grid cards" markdown>

- :material-image-filter-center-focus-strong: **Appium Core** - defines the core APIs
- :material-car: **Drivers** - implement connectivity to specific platforms
- :octicons-code-16: **Clients** - implement Appium's API in specific languages
- :fontawesome-solid-plug: **Plugins** - change or extend Appium's core functionality

</div>

Therefore, in order to start automating something with Appium, you need to:

- Install Appium itself
- Install a driver for your target platform
- Install a client library for your target programming language
- (Optional) install one or more plugins

These are the basics! If you are ready to jump in, proceed with the [Quickstart](../quickstart/index.md)!

If you wish to learn more details about how it all works, see these pages for background material:

- [Appium Core](./appium.md)
- [Appium Drivers](./drivers.md)
- [Appium Clients](./clients.md)

Finally, to learn about the origins of Appium, check out the [Appium Project History](./history.md).
