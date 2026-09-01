---
authors:
  - mykola
date: 2026-09-01
---

# Announcing watchOS Simulator Support in the XCUITest Driver

We’re excited to announce that the XCUITest driver now supports automation of watchOS apps — a
platform that’s been on Appium’s requested list for a long time.

<!-- more -->

In order to automate watchOS, you'll need the following:

* XCUITest driver version 12.6.0 or later (WebDriverAgent 16.5.0 or later)
* Xcode 15.4 or later
* watchOS 10 or later

Important to note: ^^the driver currently only works with simulators — real devices are not
compatible.^^

The good news: automating a watchOS app looks just like automating any other iOS/iPadOS app. The
standard use-cases of finding and clicking on elements, retrieving the page source, using the
Appium Inspector — all work as usual. The one exception here is standard W3C gesture/touch actions
(tap/swipe via the Actions API), which are not supported.

On top of that, a few watchOS-specific extensions are available:

- `mobile: pressButton` — press the Digital Crown or Action button
- `mobile: rotateDigitalCrown` — rotate the Digital Crown (since driver version 12.7.0)
- `mobile: performHandGesture` — perform double-tap or wrist flick hand gestures (since driver
  version 12.7.0)

For full setup instructions, capabilities, and limitations, check out the
[watchOS guide](https://appium.github.io/appium-xcuitest-driver/latest/guides/watchos/).

Happy testing!
