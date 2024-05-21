---
hide:
  - toc

title: Install Appium
---

!!! info

    Before installing, make sure to check the [System Requirements](./requirements.md).

Appium can be installed using `npm`:

```bash
npm install appium
```

!!! note

    Other package managers are not currently supported.

## Starting Appium

Appium can be started [using the command line](../cli/index.md):

```
appium
```

This launches the Appium server process, which loads all the installed Appium drivers, and
begins waiting for new session requests from client connections (such as test automation scripts). Since the server process is
independent from its clients, it must always be explicitly
launched before starting a new session.

The console log will list all the valid URLs that clients can use to connect to this server:

```
[Appium] You can provide the following URLs in your client code to connect to this server:
[Appium] 	http://127.0.0.1:4723/ (only accessible from the same host)
(... any other URLs ...)
```

Once a client requests a new session, the Appium server process will start logging all details about
this session until its termination. Keep this in mind - if you ever encounter issues with Appium
tests, you can always check the server log for more details.

Now, even though Appium is installed and running, it does not come bundled with any drivers, meaning
it cannot automate anything yet. We will set up automation for Android - continue to the next step:
[Installing the UiAutomator2 Driver](./uiauto2-driver.md).
