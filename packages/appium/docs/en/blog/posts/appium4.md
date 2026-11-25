---
authors:
  - eglitise
date: 2026-11-15
---

# 🚀 Appium 4

Appium 4 is here! A major milestone in the evolution of Appium, this release aims to strengthen
Appium's compliance with the W3C WebDriver protocol, modernize the codebase, and as usual, remove
deprecated legacy functionality. 

<!-- more -->

While Appium 3 was primarily a cleanup release that removed a lot of deprecated endpoints, Appium 4
has a broader scope of changes. A few legacy endpoints have still been removed, but the key focus
this time has been on various behavioral adjustments for closer alignment with the W3C WebDriver
protocol specification, as well as full removal of support for drivers/plugins who relied on the
obsolete JSONWP/MJSONWP protocols.

The key breaking changes are as follows:

- Minimum Node.js version is raised to 22.22
- All Appium packages are now ESM-only
- The Windows driver is replaced with the WinCore driver
- Some deprecated endpoints have been removed (far fewer than in Appium 3!)
- The server flag for enabling CORS has been renamed

When it comes to new features, Appium 4 adds only a few, similarly to Appium 3:

- New server flag for controlling allowed app URLs in capabilities like `appium:app`
- The `install` and `update` CLI commands now gracefully handle any incompatibilities with the
  extension's declared server version range
- The universal XML plugin's translation can now be toggled mid-session

As usual, the full [Appium 4 migration guide](../../guides/migrating-3-to-4.md) describes the full
extent of the important changes included in this major release.

The Appium team is incredibly grateful to all contributors who made this release possible!

Happy testing!
