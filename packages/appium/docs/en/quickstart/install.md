---
hide:
  - toc

title: Install Appium
---

!!! info

    Before installing, make sure to check the [System Requirements](./requirements.md).

You can install Appium globally using `npm`:

```bash
npm i -g appium
```

!!! note

    Other package managers are not currently supported.

After installation, you should be able to run Appium from the command line:

```
appium
```

You should see some output that starts with a line like this:

```
[Appium] Welcome to Appium v2.4.1
```

In order to update Appium using `npm`:

```bash
npm update -g appium
```

That's it! If you see this, the Appium server is up and running. Go ahead and quit
it (Ctrl-C) and move on to the [next step](./uiauto2-driver.md), where we'll install a driver for automating Android apps.
