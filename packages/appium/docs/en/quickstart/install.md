---
title: Install Appium
---

Installing Appium is as easy as running a single NPM command:

```bash
npm i -g appium@next
```

!!! note

    Currently, you must use `appium@next` instead of just `appium`. Once Appium 2.0 has been
    officially published, you can simply use `appium`.

This command installs Appium globally on your system so that you can access it from the command
line simply by running the `appium` command. Go ahead and run it now:

```
appium
```

You should see some output that starts with a line like this:

```
[Appium] Welcome to Appium v2.0.0
```

That's it! If you get this kind of output, the Appium server is up and running. Go ahead and quit
it (CTRL-C) and move on to the next step, where we'll install a driver for automating Android apps.
