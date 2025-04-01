---
title: Migrating to Appium 3
---

This document is a guide for those who are using Appium 2 and would like to upgrade to Appium 3.
It contains a list of breaking changes, as well as suggestions for handling them.

While Appium 2 was a major overhaul of the entire Appium architecture, Appium 3 is a smaller
upgrade with fewer breaking changes, which should result in a much simpler migration process.

## Node 20+ Required

With Appium 2, the minimum required Node version was set to `14.17.0`. Support for Node 14 had
already ended before the release of Appium 2, which meant that even users on outdated Node versions
were able to use it.

Appium 3 drops support for outdated Node versions, and bumps the minimum required version to Node
`20.9.0`, as well as the minimum `npm` version to `10`.

!!! info "Actions Needed"

    Upgrade Node.js to `v20.9.0` or newer, and `npm` to `v10` or newer

## Old Endpoints Removed

Appium 3 removes many server endpoints that do not conform to the endpoint template defined in the
[W3C WebDriver specification](https://w3c.github.io/webdriver/#extensions-0). Nearly all of these
have direct or close-to-direct replacements in either standard W3C endpoints, other Appium
endpoints, or driver-specific extension commands.

A full list of these endpoints, along with replacements (where applicable) is available
[at the bottom of this page](#removed-endpoints).

!!! info "Actions Needed"

    Check your Appium client documentation for the affected methods, and adjust your code to use
    their replacements

## Feature Flag Prefix Required

With Appium 2, it was possible to opt into certain [insecure features](http://appium.io/docs/en/latest/guides/security/)
on server startup, which could be enabled using the `--allow-insecure` or `--relaxed-security`
flags. Appium `2.13` added the ability to optionally provide a scope prefix to specific features,
ensuring that they would only be enabled for the specified driver (or all of them).

Appium 3 makes the scope prefix mandatory, and will throw an error if features are specified
without a scope. Note that the behavior of the `--relaxed-security` flag remains unchanged.

!!! info "Actions Needed"

    If you use the `--allow-insecure` server flag, add a scope prefix before each feature name.
    For example, if you use the UiAutomator2 `adb_shell` feature, on Appium 2 you would enable it
    like this:
    ```
    appium --allow-insecure=adb_shell
    ```
    On Appium 3, to ensure this feature is only activated for UiAutomator2, you can run it like so:
    ```
    appium --allow-insecure=uiautomator2:adb_shell
    ```
    Alternatively, if you wish to keep the Appium 2 behavior and enable the feature for _all_
    drivers that support it, you can run it like so:
    ```
    appium --allow-insecure=*:adb_shell
    ```

## Unzip Logic Removed

Appium 3 removes the custom unzip logic used when working with files such as application packages.
Such files are often only relevant to particular platforms, therefore the functionality for
handling such operations has been moved to relevant drivers.

!!! info "Actions Needed"

    Ensure you are using the most recent versions of your drivers

## Express 5

Appium 3 upgrades the internally-used `express` dependency from `v4` to `v5`. This should not
affect users who use Appium directly, but developers integrating parts of Appium into their own
projects may want to check [the Express 5 Migration Guide](https://expressjs.com/en/guide/migrating-5.html).

!!! info "Actions Needed"

    None! (hopefully)

## Removed Endpoints