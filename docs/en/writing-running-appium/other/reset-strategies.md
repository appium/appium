# Reset Strategies

| Automation Name | default | fullReset | noReset |
| --------------- | ------- | --------- | ------- |
| iOS (including XCUITest) | Shut down sim after test. Do not destroy sim. Clear local data on sim if bundleId cap is provided. Do not uninstall app from real device. | Uninstall app before and after real device test, destroy Simulator before and after sim test. They happen only _before_ if `resetOnSessionStartOnly: true` is provided | Do not destroy or shut down sim after test. Start tests running on whichever sim is running, or device is plugged in |
| Android | Stop and clear app data after test. Do not uninstall apk | Stop app, clear app data and uninstall apk before session starts and after test | Do not stop app, do not clear app data, and do not uninstall apk. |
