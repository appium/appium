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
|[Appium CI + Metrics Improvements](https://github.com/appium/appium/issues/7168)|We have CI servers running via Cloudbees that we don't understand and which break. Let's document and own them so they work reliably. Also, let's implement gathering various metrics about driver performance so we can track this over time and ensure we're not releasing a driver which has decreased in performance or reliability.|Q2 2017|N/A|

## Upcoming Projects (in rough order of priority)

| Project | Description |
|---------|-------------|
|[Onboarding Overhaul](https://github.com/appium/appium/issues/7169)|The current Appium docs leave a lot to be desired. The format is confusing (it would be better for API docs), the content is outdated, and many things are still undocumented. This project would go back to the drawing board in all of these areas and put together something genuinely helpful for the community, which hopefully reduces the kind of support issues we're currently flooded by.|
|[Appium Client Library Updates](https://github.com/appium/appium/issues/7170)|It's been too long since we ensured that Appium's client libraries were up to date with the server|
|[Sample Code Overhaul](https://github.com/appium/appium/issues/7171)|Our sample code repo has grown tangled and broken. Let's make a new one with minimal examples which are the same across every language, and actually maintain the repo so as not to let it become overgrown.|
|[Test App Overhaul](https://github.com/appium/appium/issues/7172)|Our current test applications (the ones used to test Appium's iOS and Android support) are not ideal. We use too many of them and the ones we use have a random hodgepodge of app SDK features, sometimes not enough to sufficiently test automation support. It'd be great to find a way to ensure our test app(s) have all the features we need to test, and keep in sync with our requirements.|
|[iOS Test Startup Time Improvement](https://github.com/appium/appium/issues/7173)|iOS startup times have gotten progressively longer with each iOS release. In part this is Apple's fault and there's not anything we can do about it. But we should investigate and see if we can be more efficient in how we start, especially given that we can now focus on XCUITest and leave Instruments behind|
|[Appium Dearchitecture](https://github.com/appium/appium/issues/7174)|OK, we went a bit overboard in Appium 1.5 by exploding Appium into 40+ repos and NPM packages. Let's think a little more critically about it and consolidate into the minimal number of repos/packages that make sense for our code and community patterns.|
|[Appium 2.0](https://github.com/appium/appium/issues/7175)|Appium, rather than bundling all the separate drivers by default, becomes a driver management interface (in addition to continuing to play the role of automation frontend server). Appium gets a set of CLI tools for users to pick and choose which drivers and versions of drivers they want to use via Appium|

## Projects Under Consideration (unplanned and unprioritized)

| Project | Description |
|---------|-------------|
|Windows Phone Support|There has been some work done on automating Windows Phone apps. We could take this all the way to integration with Appium in the form of a WindowsDriver.|
|Apple Watch support|Appium should support Apple Watch apps via the Watch simulator|
|Unity3d backend POC|This is a research project to determine whether we can add some kind of support for 3d game automation, probably based on the Unity3d game development platform.|

## Completed Roadmap Projects

| Project | Description | Completed | Appium Release | Notes |
|---------|-------------|-----------|----------------|-------|
|[New Appium GUIs](https://github.com/appium/appium/issues/7167)|The current Appium GUIs (Appium.app and Appium.exe) have a number of issues. They aren't maintained by the core Appium team. They're written in Objective-C and C# respectively: two languages, and specifically, two languages other than Appium's core language. Because of this they lag behind the Appium server and are often broken. However, users love them primarily because of the Inspector feature (the thing that lets them graphically navigate their app), so we have to field a ton of complaints about these projects. There's an opportunity to start over. With [Electron](http://electron.atom.io/), we'd be able to take the new version of Appium we're working on and embed it directly inside a Node-based GUI app written using the languages and technologies the core team is experienced with. We'd have one codebase and could distribute the app on Mac, Windows, and Linux. The GUIs would become an official part of Appium's release cycle so they wouldn't be broken.|3/2017|N/A|[Appium Desktop website](https://github.com/appium/appium-desktop)|
|[Android 7.1.1 Support](https://github.com/appium/appium/issues/7165)|Google has released Android 7.1.1 (API Level 25). Ensure it works with UiAutomator 1/2|2/2017|1.6.4||
|[Android 7.0 Support](https://github.com/appium/appium/issues/7156)|Support Android 7 (Nougat)|11/2016|1.6.3||
|[iOS 10.2 Support](https://github.com/appium/appium/issues/7166)|Support iOS 10.2|11/2016|1.6.1||
|[iOS 10.1 Support](https://github.com/appium/appium/issues/7105)|Support iOS 10.1|11/2016|1.6.1||
|UiAutomator2 integration|Google has released [UiAutomator 2](http://developer.android.com/reference/android/support/test/uiautomator/package-summary.html), and it promises to fix some issues and limitations with the previous UiAutomator support. We will build this inside of Selendroid since it requires an instrumentation context.|10/2016?|1.6.0|
|XCUITest integration / iOS 10 support|Instruments + UIAutomation has been working well for many Appium users, but requires crazy workarounds to deal with bugs which remain unfixed on the Apple side. Also, UIAutomation has been removed in favor of XCUITest for iOS 10+. This new backend would exist alongside the UIAutomation backend.|10/2016|1.6.0||
|iOS 9.3 support|Appium should support iOS 9.3 / Xcode 7.3|3/2016|1.5.1||
|[Architecture Overhaul](https://github.com/appium/appium/issues/5169)|Appium's architecture has grown unwieldy enough that adding new features and preventing regressions has become difficult. A rearchitecture is in order to solve these issues as well as migrate the codebase to a form of JS much easier to work in and understand.|2/2015|1.5.0||
|iOS 9.2 support|Appium should support iOS 9.2 / Xcode 7.2|11/2015|1.4.14||
|iOS 9.1 support|Appium should support iOS 9.1 / Xcode 7.1|10/2015|1.4.12||
|iOS 9.0 support|Appium should support iOS 9.0 / Xcode 7.0|10/2015|1.4.11||
|iOS 8.4 support|Appium should support iOS 8.4 / Xcode 6.2|5/2015|1.4.0||
|Appium CI|Appium has unique needs for Continuous Integration because of the highly specialized environments required (iOS simulators, Xcode, Android emulators, the Android SDK, etc...). We therefore need to create a custom CI solution (perhaps sitting underneath Cloudbees or some other OSS-friendly CI server) that can be used for all Appium projects which need integration tests.|5/2015|_N/A_|Usage instructions at [appium/appium-ci](https://github.com/appium/appium-ci)|
