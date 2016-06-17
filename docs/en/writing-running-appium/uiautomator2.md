# UIAutomator 2

While the API remains almost the same, the internal implementation has changed and we see the introduction of UIObject2

### UIObject2

Unlike UiObject, the UIElement is bound to a particular view instance and can become stale if the underlying view object is destroyed. As a result, it may be necessary to call findObject(BySelector) to obtain a new UiObject2 instance if the UI changes significantly.

### The Build System

UIAutomator 2 utilizes capabilities of Gradle as a build system. Previous, UIAutomator used Maven/Ant. 

### Test Assets

Test packages produced are now APKs. Previously, UIAutomator produced .jar or .zip files. This makes UIAutomator 2 completely Android instrumentation capable.

### ADB

ADB deals with UIAutomator 2 slightly differently.

The original version of UiAutomator ran as a shell program:

```adb shell uiautomator runtest ...```

UiAutomator 2 is based on Android Instrumentation. Tests are compiled to APKs, and run in an application process:

```adb shell am instrument ...```
