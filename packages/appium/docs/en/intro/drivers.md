---
title: Intro to Appium Drivers
---

As the [main Overview](index.md) makes clear, "drivers" are basically Appium's answer to the
question, "how do we support automation of multiple, unrelated platforms?" In this doc we'll get
into a little more detail about how drivers work. The specific details of how drivers work probably
don't matter too much for you, unless you're planning on writing your own driver or contributing to
an existing driver (things we hope you do!).

The main benefit in understanding a bit more of how drivers work is that being aware of the typical
complexity or the typical driver architecture will inform your debugging process when you
inevitably run into an issue in one of your tests.

## Interface Implementations

At the most basic level, drivers are simply Node.js classes that extend a special class included in
Appium, called `BaseDriver`. You could have something very close to a "working" driver, with these
very simple lines of code:

```js
import BaseDriver from '@appium/base-driver'

class MyNewDriver extends BaseDriver {
}
```

This empty driver doesn't *do* anything, but you could wrap it up in a Node.js module, add a few
Appium-related fields to the module's manifest (`package.json`), and then install it using `appium
driver install`.

So, from a technical perspective, an Appium driver is just a bit of code that inherits from some
other Appium code. That's it! Now, inheriting from `BaseDriver` actually gives us a lot, because
`BaseDriver` is essentially an encapsulation of the entire WebDriver protocol. So all a driver
needs to do to do something useful is to *implement* Node.js methods with names corresponding to
their WebDriver protocol equivalents.

So let's say I wanted to do something with this empty driver; first I have to decide which
WebDriver command I want to implement. For our example, let's take the [Navigate
To](https://www.w3.org/TR/webdriver1/#navigate-to) WebDriver command. Leave aside for the moment
what I want to have the driver *do* when this command is executed. To tell Appium the driver can
handle the command, all we have to do is define a method like this in our driver class:[^1]

```js
async setUrl(url) {
    // do whatever we want here
}
```

[^1]: You might notice that `setUrl` doesn't look anything like `Navigate To`, so how did we know
  to use it rather than some other random string? Well, Appium's WebDriver-protocol-to-method-name
  mapping is defined in a special file within the `@appium/base-driver` package called
  [routes.js](https://github.com/appium/appium/blob/2.0/packages/base-driver/lib/protocol/routes.js).
  So if you're writing a driver, this is where you would go to figure out what method names to use
  and what parameters to expect. Or you could look at the source for any of the main Appium
  drivers!

That's it! How we actually implement the command is totally up to us, and depends on the
platform(s) we want to support. Here are some different example implementations of this command for
different platforms:

- Browsers: execute some JavaScript to set `window.location.href`
- iOS apps: launch an app using a deep link
- Android apps: launch an app using a deep link
- React apps: load a specific route
- Unity: go to a named scene

So you can see there can be a lot of differences between how drivers implement the same WebDriver
command across platforms.[^2] What is the *same*, though, is how they express that they can handle
a protocol command.

[^2]: Of course, we want to keep the semantics as similar as possible, but in the world of iOS, for
  example, launching an app via a deep link (a URL with a special app-specific scheme) is about as
  close as we are going to get to navigating to a web URL.

We're going into this great amount of detail (which you don't need to remember, by the way),
because it's important to stress the point that an Appium driver is not inherently anything in
particular, other than a bit of JS code that can handle WebDriver protocol commands. Where you go
from there is up to you, the driver author!

## Automation mapping

But *typically* what driver authors want to do is to provide automation behaviours for a given
platform(s) that are semantically very similar to the the WebDriver spec implementations for
browsers. When you want to find an element, you should get a reference to a UI element. When you
want to click or tap that element, the resulting behaviour should be the same as if a person were
to click or tap on the element. And so on.

So the real challenge for driver authors is not how to work with the WebDriver protocol (because
`BaseDriver` encapsulates all that for you), but how to make the actual automation happen on the
target platform. Every driver relies on its own set of underlying technologies here. As mentioned
in the [Overview](index.md), the iOS driver uses an Apple technology called
[XCUITest](https://developer.apple.com/documentation/xctest/xcuielement). These underlying
automation technologies usually have proprietary or idiosyncratic APIs of their own. Writing
a driver becomes the task of mapping the WebDriver protocol to this underlying API (or sometimes
a set of different underlying APIs--for example, the UiAutomator2 driver relies not only on the
[UiAutomator2](https://developer.android.com/training/testing/other-components/ui-automator)
technology from Google, but also functions only available through
[ADB](https://developer.android.com/studio/command-line/adb), as well as functions only available
via the Android SDK inside a helper app). Tying it all together into a single, usable, WebDriver
interface is the incredibly useful (but incredibly challenging) art of driver development!

## Multi-level architecture

In practice, this often results in a pretty complex architecture. Let's take iOS for example again.
The XCUITest framework (the one used by the Appium driver) expects code that calls it to be written
in Objective-C or Swift. Furthermore, XCUITest code can only be run in a special mode triggered by
Xcode (and directly or indirectly, the Xcode command line tools). In other words, there's no
straightforward way to go from a Node.js function implementation (like `setUrl()` above) to
XCUITest API calls.

What the XCUITest driver authors have done is instead to split the driver into two parts: one part
written in Node.js (the part which is incorporated into Appium and which initially handles the
WebDriver commands), and the other part written in Objective-C (the part which actually gets run on
an iOS device and makes XCUITest API calls). This makes interfacing with XCUITest possible, but
introduces the new problem of coordination between the two parts.

The driver authors could have chosen any of a number of very different strategies to model the
communication between the Node.js side and the Objective-C side, but at the end of the day decided
to use ... the WebDriver protocol! That's right, the Objective-C side of the XCUITest driver is
itself a WebDriver implementation, called
[WebDriverAgent](https://github.com/appium/webdriveragent).[^3]

[^3]: You could in theory, therefore, point your WebDriver client straight to WebDriverAgent and
  bypass Appium entirely. This is usually not convenient, however, for a few reasons:

  - The Appium XCUITest driver builds and manages WebDriverAgent for you, which can be a pain and
    involves the use of Xcode.
  - The XCUITest driver does lots more than what can be done by WebDriverAgent, for example working
    with simulators or devices, installing apps, and the like.

The moral of the story is that driver architectures can become quite complicated and multilayered,
due to the nature of the problem we're trying to solve. It also means it can be difficult sometimes
to tell where in this chain of technologies something has gone wrong, if you run into a problem
with a particular test. With the XCUITest world again, we have something like the following set of
technologies all in play at the same time:

- Your test code (in its programming language) - owned by you
- The Appium client library - owned by Appium
- The Selenium client library - owned by Selenium
- The network (local or Internet)
- The Appium server - owned by Appium
- The Appium XCUITest driver - owned by Appium
- WebDriverAgent - owned by Appium
- Xcode - owned by Apple
- XCUITest - owned by Apple
- iOS itself - owned by Apple
- macOS (where Xcode and iOS simulators run) - owned by Apple

It's a pretty deep stack!

## Proxy mode

There's one other important architectural aspect of drivers to understand. It can be exemplified
again by the XCUITest driver. Recall that we just discussed how the two "halves" of the XCUITest
driver both speak the WebDriver protocol---the Node.js half clicks right into Appium's WebDriver
server, and the Objective-c half (WebDriverAgent) is its own WebDriver implementation.

This opens up the possibility of Appium taking a shortcut in certain cases. Let's imagine that the
XCUITest driver needs to implement the `Click Element` command. The internal code of this
implementation would look something like taking the appropriate parameters and constructing an HTTP
request to the WebDriverAgent server. In this case, we're basically just reconstructing the
client's original call to the Appium server![^4] So there's really no need to even write a function
implementing the `Click Element` command. Instead, the XCUITest driver can just let Appium know
that this command should be proxied directly to some other WebDriver server.

[^4]: It's not *exactly* the same call, because the Appium server and the WebDriverAgent server
  will generate different session IDs, but these differences will be handled transparently.

If you're not familiar with the concept of "proxying," in this case it just means that the XCUITest
driver will not be involved at all in handling the command. Instead it will merely be repackaged
and forwarded to WebDriverAgent at the protocol level, and WebDriverAgent's response will likewise
be passed back directly to the client, without any XCUITest driver code seeing it or modifying it.

This architectural pattern provides a nice bonus for driver authors who choose to deal with the
WebDriver protocol everywhere, rather than constructing bespoke protocols. It also means that
Appium can create wrapper drivers for any other existing WebDriver implementation very easily. If
you look at the [Appium Safari driver](https://github.com/appium/appium-safari-driver) code, for
example, you'll see that it implements basically no standard commands, because all of these are
proxied directly to an underlying SafariDriver process.

It's important to understand that this proxying business is sometimes happening under the hood,
because if you're ever diving into some open source driver code trying to figure out where
a command is implemented, you might be surprised to find no implementation at all in the Node.js
driver code itself! In that case, you'll need to figure out where commands are being proxied to so
you can look there for the appropriate implementation.

OK, that's enough for this very detailed introduction to drivers!
