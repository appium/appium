---
hide:
  - toc

title: Install Appium
---

!!! info

    Before installing, make sure to check the [System Requirements](./requirements.md).

Appium can be installed globally using `npm`:

```bash
npm install -g appium
```

!!! note

    Other package managers are not currently supported.

## Starting Appium

Appium can be started [using the command line](../cli/index.md):

```
appium
```

This launches the Appium server process, which loads all the installed Appium drivers, and
begins waiting for new session requests from client connections (such as test automation scripts).
Since the server process is independent from its clients, it must be explicitly launched before
attempting to start a new session.

When the server is launched, the console log will list all the valid URLs that clients can use to
connect to this server:

```
[Appium] You can provide the following URLs in your client code to connect to this server:
[Appium] 	http://127.0.0.1:4723/ (only accessible from the same host)
(... any other URLs ...)
```

Once a client requests a new session, the Appium server process will start logging all details about
this session until its termination. Keep this in mind - if you ever encounter issues with Appium
tests, you can always check the server log for more details.

So what's next? Even though Appium is installed and running, it does not come bundled with any
drivers, which means it cannot automate anything yet. We will therefore set up automation for
Android - continue to [Installing the UiAutomator2 Driver](./uiauto2-driver.md).
