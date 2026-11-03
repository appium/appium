---
hide:
  - toc

title: Insecure Features
---

The Appium server implements [a security protection mechanism](../../guides/security.md) that
allows the management of various insecure features.

The following features are defined on the server level and can be used even without drivers, but
they can only be enabled using the wildcard (`*`) prefix:

| Feature Name        | Description                                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| `session_discovery` | Allows retrieving the list of active server sessions via `GET /appium/sessions` |

Of course, Appium drivers and plugins are free to define additional insecure features of their own.
The following features are defined by official plugins:

| Feature Name            | Plugin           | Description                                                |
| ----------------------- | ---------------- | ---------------------------------------------------------- |
| `execute_driver_script` | `execute_driver` | Allows sending a request that has multiple Appium commands |
