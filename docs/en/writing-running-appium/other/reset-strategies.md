# Reset Strategies

| Automation Name | default | fullReset | noReset |
| --------------- | ------- | --------- | ------- |
| iOS (including XCUITest) | Shut down sim after test. Do not destroy sim. If it is a simulator and `app` capability is provided, uninstalls the app-under-test* but does not destroy simulator. If it is a real device or a simulator with only `bundleId` capability, does not uninstall app-under-test. | Uninstall app before and after real device test, destroy Simulator before and after sim test. They happen only _before_ if `resetOnSessionStartOnly: true` is provided | Do not destroy or shut down sim after test. Start tests running on whichever sim is running, or device is plugged in |
| Android | Stop and clear app data after test. Do not uninstall apk | Stop app, clear app data and uninstall apk before session starts and after test | Do not stop app, do not clear app data, and do not uninstall apk. |

*: Make sure the local data has been deleted from the simulator environment rather than they remain unexpectedly.
