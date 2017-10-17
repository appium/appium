# Reset Strategies

| Automation Name | default | fullReset | noReset |
| --------------- | ------- | --------- | ------- |
| iOS (including XCUITest) | Shut down sim after test. Do not destroy sim. Do not uninstall app from real device. | Uninstall app after real device test, destroy Simulator after sim test | Do not destroy or shut down sim after test. Start tests running on whichever sim is running, or device is plugged in |
| Android | Stop and clear app data after test. Do not uninstall apk | Stop app, clear app data and uninstall apk after test | Do not stop app, do not clear app data, and do not uninstall apk. |
