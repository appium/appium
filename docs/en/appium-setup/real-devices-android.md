## Appium on Android Real Devices

Hooray! There is nothing extra to know about testing real Android devices: it
works exactly the same as testing on emulators. Make sure that your device
can connect to ADB and has Developer Mode enabled (the process for this differs
for different vendors, so check their documentation). For testing Chrome on a real
device, you are responsible for ensuring that Chrome of an appropriate version
is installed.

Also, you will want to make sure that "Verify Apps" in settings is
disabled/unchecked, otherwise it can prevent some of Appium's helper apps from
launching and doing their job correctly.
