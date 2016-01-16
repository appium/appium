Appium Roadmap
---------------

This document is designed to be a living record of the current and projected
priorities for the Appium project. It is, of course, always subject to change
and exists solely to give the community an idea of where we're going. The
roadmap is set by the Appium core team. If you have feature suggestions for
Appium, please submit a [GitHub issue](https://github.com/appium/appium/issues)
and, if of sufficient size and approved by the team, it will be added here. If
you have concerns about the roadmap, you can e-mail the Appium devs at
`appium-developers@googlegroups.com` or raise a GitHub issue. Note that
bugfixes and miscellaneous features are not considered "roadmap projects", and
will be addressed in the due course of normal Appium development. This page
exists to outline large-scale future plans for Appium.

## Current Roadmap Projects

| Project | Description | ETD | Projected Appium Release |
|---------|-------------|-----|--------------------------|
|[Architecture Overhaul](https://github.com/appium/appium/issues/5169)|Appium's architecture has grown unwieldy enough that adding new features and preventing regressions has become difficult. A rearchitecture is in order to solve these issues as well as migrate the codebase to a form of JS much easier to work in and understand.|1/2016|1.5|
|XCUITest backend integration|Instruments + UIAutomation has been working well for many Appium users, but requires crazy workarounds to deal with bugs which remain unfixed on the Apple side. We should explore Apple's newer technology, XCUITest, in order to see if the overall experience is more stable. This new backend would exist alongside the UIAutomation backend.|3/2016?|Beta in 1.6?|
|UiAutomator2 backend integration|Google has released [UiAutomator 2](http://developer.android.com/reference/android/support/test/uiautomator/package-summary.html), and it promises to fix some issues and limitations with the previous UiAutomator support. We will build this inside of Selendroid since it requires an instrumentation context.|3/2016?|TBD|
|iOS 9.3 support|Appium should support iOS 9.3 / Xcode 7.3|2/2016|1.6?||

## Upcoming Projects (in rough order of priority)

| Project | Description |
|---------|-------------|
|Apple Watch support|Appium should support Apple Watch apps via the Watch simulator|
|Onboarding Overhaul|The current Appium docs leave a lot to be desired. The format is confusing (it would be better for API docs), the content is outdated, and many things are still undocumented. This project would go back to the drawing board in all of these areas and put together something genuinely helpful for the community, which hopefully reduces the kind of support issues we're currently flooded by.|
|New Appium GUIs|The current Appium GUIs (Appium.app and Appium.exe) have a number of issues. They aren't maintained by the core Appium team. They're written in Objective-C and C# respectively: two languages, and specifically, two languages other than Appium's core language. Because of this they lag behind the Appium server and are often broken. However, users love them primarily because of the Inspector feature (the thing that lets them graphically navigate their app), so we have to field a ton of complaints about these projects. There's an opportunity to start over. With [Electron](http://electron.atom.io/), we'd be able to take the new version of Appium we're working on and embed it directly inside a Node-based GUI app written using the languages and technologies the core team is experienced with. We'd have one codebase and could distribute the app on Mac, Windows, and Linux. The GUIs would become an official part of Appium's release cycle so they wouldn't be broken.|
|Unity3d backend POC|This is a research project to determine whether we can add some kind of support for 3d game automation, probably based on the Unity3d game development platform.|
|Dynamic Test App|Our current test applications (the ones used to test Appium's iOS and Android support) are not ideal. We use too many of them and the ones we use have a random hodgepodge of app SDK features, sometimes not enough to sufficiently test automation support. Using [Titanium](https://github.com/appcelerator/titanium_mobile), we can develop an app that allows us to inject whatever native code we need, as we need it. The app thus changes itself test-by-test to have whatever UI features we need for that particular test. It gives us much more fine-grained control over what we're testing. The app code would also be cross-platform and written in JS, which would make it easier for the core team to write and maintain.|

## Projects Under Consideration (unprioritized)

| Project | Description |
|---------|-------------|
|Windows Phone Support|There has been some work done on automating Windows Phone apps. We could take this all the way to integration with Appium in the form of a WindowsDriver.|

## Completed Roadmap Projects

| Project | Description | Completed | Appium Release | Notes |
|---------|-------------|-----------|----------------|-------|
|iOS 9.2 support|Appium should support iOS 9.2 / Xcode 7.2|11/2015|1.4.14||
|iOS 9.1 support|Appium should support iOS 9.1 / Xcode 7.1|10/2015|1.4.12||
|iOS 9.0 support|Appium should support iOS 9.0 / Xcode 7.0|10/2015|1.4.11||
|iOS 8.4 support|Appium should support iOS 8.4 / Xcode 6.2|5/2015|1.4.0||
|Appium CI|Appium has unique needs for Continuous Integration because of the highly specialized environments required (iOS simulators, Xcode, Android emulators, the Android SDK, etc...). We therefore need to create a custom CI solution (perhaps sitting underneath Cloudbees or some other OSS-friendly CI server) that can be used for all Appium projects which need integration tests.|5/2015|_N/A_|Usage instructions at [appium/appium-ci](https://github.com/appium/appium-ci)|
