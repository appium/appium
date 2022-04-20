---
title: Intro to Appium
---

As mentioned on the main page, Appium is an open-source project and ecosystem of related software,
designed to facilitate UI automation of many app platforms. With the release of Appium 2.0, Appium
has the following primary goals:[^1]

- Make platform-specific automation capabilities available under a cross-platform, standard API
- Allow easy access to this API from any programming language
- Provide tools to enable convenient community development of Appium extensions

[^1]:
    To meet these primary goals, we also work with a set of secondary goals or methodology
    principles, which we also encourage for Appium extension developers:

    - As far as possible, rely on (and contribute to) open source technology
    - As far as possible, rely on vendor-provided tools for a given platform
    - As far as possible, rely on automation tools that allow automation of unmodified apps (prefer
      not to require the user to build in additional SDKs or software that introduce discrepancies
      between the test version of the app and the production version)
    - As far as possible, rely on existing standards instead of creating new ones

So, take any app platform you know about, like iOS or Android. Appium wants for there to be a way
for developers and testers to write UI automation code for that platform, according to a single,
unified API. Based on Appium's goals, we have a lot of questions to answer to make it all work:

- Which API should that "single, unified" API be?
- How do we map that API to automation behaviour for a specific platform?
- How do we make that API accessible via multiple popular programming languages?

There's another, larger, question lurking in the background here too, given that there are more app
platforms out there than just iOS and Android:

- How do we enable automation for *all* the platforms?

Exploring Appium's answers to these questions may not be the quickest way to learn what Appium is,
but it is certainly a good one! So let's dive in.

## Appium's choice of API

Appium is very fortunate to have been preceded by a technology which has been a long-standing
pioneer in the field of UI automation, namely [Selenium](https://seleniumhq.org). The goal of the
Selenium project has been to support UI automation of web browsers, and in this way we can think of
it as occupying a subset of Appium's goals. Along the way, Selenium (and, after they merged,
another project called WebDriver) developed a relatively stable API for browser automation.

Over the years, Selenium worked with various web browser vendors and the [W3C](https://w3c.org)
standards group to turn its API into an official web browser standard, called the [WebDriver
specification](https://w3c.github.io/webdriver/webdriver-spec.html). All the main browsers now
implement automation capabilities inline with the WebDriver spec, without the Selenium team having
to maintain any software that performs actual automation; standards for the win!

Appium's initial goals were to develop an automation standard for mobile apps (iOS and Android). We
could have made up something new, but in the spirit of joining forces and keeping standards, well,
standard, we decided to adopt the WebDriver spec as Appium's API.[^2] While user interaction on
websites and in mobile native apps are not entirely identical (with even greater differences once
we start to consider, for example, TV platforms controlled by simple remotes), the fact is that
most software UIs are pretty much the same. This means that the WebDriver spec provides automation
API primitives (finding elements, interacting with elements, loading pages or screens, etc...) that
more or less map to any platform.

[^2]: Technically, when Appium was first written, we were dealing with something older than the
  WebDriver spec, called the JSON Wire Protocol. Since then, Appium continued to evolve along with
  the W3C spec and is fully W3C-compliant.

Of course, Appium wants to support the cases where user interaction *does* differ from web to
mobile or web to TV, and so Appium also makes use of the built-in *extensibility* of the WebDriver
spec. The result is that, no matter what platform you want to automate, when you use Appium, you
will do so using the standard WebDriver spec, with two caveats:

- We might not have any way to support a particular WebDriver API command on a given platform, and
  so some commands might be unsupported (for example, getting or setting cookies is not possible in
  the world of native mobile app automation).
- We might support automation behaviours that go *beyond* what's available in the WebDriver API
  command list, though any such commands will be valid and spec-compliant extensions to the
  WebDriver API.

How do you actually *use* the WebDriver API, particularly in the context of Appium? We'll cover
that in the [section below](#universal-programming-language-access) on how Appium provides
universal programming language access. All you need to know for now is that the way Appium
introduces a universal UI automation interface is by implementing the WebDriver protocol.

## Platform automation behaviour

The next question is, how does Appium map this protocol to automation behaviour on a wide range of
platforms? The trick is that, strictly speaking, Appium doesn't! It leaves this responsibility up
to a kind of software module called an Appium *driver*. There's a whole [Driver
Introduction](./drivers.md) which you can read next, so we won't go into huge detail on how they
work for now.

What's important to understand at the moment is that a driver is kind of like a pluggable module
for Appium that gives Appium the power to automate a particular platform (or set of platforms,
depending on the goal of the driver). At the end of the day, a driver's responsibility is to simply
implement an Appium-internal interface representing the WebDriver protocol. How it implements this
interface is totally up to the driver, based on its strategy for making automation happen on
a specific platform. Typically, and with a lot more complexity and difficulty in the details,
a driver does this by relying on platform-specific automation technologies. For example, Apple
maintains an iOS automation technology called
[XCUITest](https://developer.apple.com/documentation/xctest/user_interface_tests). The Appium
driver that supports iOS app automation is called the [XCUITest
Driver](https://github.com/appium/appium-xcuitest-driver) because ultimately what it does is
convert the WebDriver protocol to XCUITest library calls.

One of the reasons that drivers are independent, pluggable modules is that they work completely
differently from one another. The tools and requirements for building and using drivers for
different platforms are completely different. And so Appium lets you use just the drivers that you
need for your automation tasks. Choosing drivers and installing them so that you can use them with
your Appium instance is so important that Appium has its very own [CLI for managing
drivers](../cli/extensions.md).

So, to answer our original question, the way that Appium provides access to automation capabilities
for a given platform is that the Appium team (or anyone else[^3]) writes a *driver* for that
platform, implementing as much or little of the WebDriver protocol as desired. The driver can then
be installed by anyone using Appium.

[^3]: You can build and share your own drivers! Check out [Building
  Drivers](../ecosystem/build-drivers.md) to learn more about how to develop drivers in Node.js
  that can be used with Appium.

## Universal programming language access

But what does it mean, or look like, to *use* Appium, anyway? Since Appium is ultimately a Node.js
program, it *could* have looked like importing Appium and its drivers as libraries into your own
Node.js programs. But that wouldn't meet Appium's goal of providing automation capabilities to
people using any popular programming language.

Luckily, the fact that Appium rode in on Selenium's coattails meant that we had a solution to this
problem from day one. You see, the WebDriver specification is actually an HTTP-based protocol,
meaning it is designed to be used over a network rather than within the memory of a single program.

One of the main benefits of this "client-server" architecture is that it allows the automation
implementer (the thing doing the automation, in this case the 'server') to be completely distinct
from the automation runner (the thing defining what automation should be done, in what steps,
etc..., in this case the 'client'). Basically, all the "hard stuff" (actually figuring out how to
make automation happen on a given platform) can be handled in one place by the server, and "thin"
client libraries can be written in any programming language which simply encode HTTP requests to
the server in language-appropriate way. It's possible, in other words, to bring basic Appium
/ WebDriver capabilities to a new programming language relatively easily, assuming high-level HTTP
libraries exist, simply by coding up a basic HTTP client in that language.

There are a couple important takeaways here for you, the Appium user:

- Appium is an *HTTP server*. It must run as a process on some computer for as long as you want to
  be able to use it for automation. It must be accessible on the network to whichever computer you
  want to use to run the automation from (whether that is the same machine or one across the
  world).
- Unless you want to write raw HTTP calls or use cURL, using Appium for automation involves the use
  of an [Appium Client](clients.md) in the language of your choice. The goal of each of these
  clients is to encapsulate the WebDriver protocol so that rather than worrying about the protocol
  itself, you can work with objects and methods that feel idiomatic for your language.
- The Appium server and the Appium client do *not* need to be running on the same computer. You
  simply need to be able to send HTTP requests from the client to the server over some network.
  This greatly facilitates the use of cloud providers for Appium, since they can host the Appium
  server and any related drivers and devices, and all you need to do is point your client script to
  their secure endpoints.

And of course, none of this is about "testing" per se, purely about the use of Appium and its
client libraries for automation purposes. If you want to do automation for the purpose of
"testing", you'll likely want to enlist the help of test runners, test frameworks, and the like,
none of which need be related to Appium; one of the benefits of Appium's "universal accessibility"
is that it plays well with whatever set of tools you find most beneficial for your situation.

## Appium's huge scope

Appium's vision (automation of everything under a single API) is huge! Certainly, much bigger than
the team of core maintainers for the open source project. So how does Appium hope to achieve this
goal? Basically, by empowering the community to develop functionality on top of Appium as
a *platform*. This is what we call the Appium "ecosystem".

The Appium team does officially maintain a few drivers itself (for example, the XCUITest driver
that we spoke about earlier). But it cannot hope to have the platform-specific expertise or the
capacity to maintain drivers for many different platforms. But what we have done, particularly
beginning with Appium 2.0, is to provide tools to empower the community to join in our vision:

- Anyone can create a driver simply by creating a Node.js module that conforms to the appropriate
  conventions and implements any (sub|super)set of the WebDriver protocol. Creating a driver often
  involves a minimal amount of code because the WebDriver protocol details are abstracted away, and
  many helper libraries are available---the same libraries that power the Appium team's own
  drivers.
- Sharing drivers with others is easy using the Appium driver CLI. There is no central authority.
  Anyone can share drivers publicly or privately, for free or for sale. Drivers can be open or
  closed source (though obviously we appreciate open source!).

Appium's vision of being a platform for development extends beyond the support of automation for
all app platforms. As a popular automation tool, there are many opportunities for integrating
Appium with all kinds of other tools and services. In addition, there are many feature ideas for
Appium, either as a core server or in its incarnation across various drivers, which the core team
will never have time to build. And so, with Appium 2.0, Appium has released a plugin system that
enables anyone to build and share modules that change how Appium works!

In the same way that drivers are easily shareable and consumable via the Appium driver CLI, plugins
can be published and consumed via a parallel [Plugin CLI](../cli/extensions.md). Plugins can do all
sorts of things, for example adding the ability for Appium to find and interact with screen regions
based on a template image (as in the [`images`
plugin](https://github.com/appium/appium/tree/2.0/packages/images-plugin)). There are very few
limitations on what you can do with plugins, so you might also be interested in learning how to
[Build Plugins](../ecosystem/build-plugins.md) in Node.js that can be used with Appium.

So that's Appium: an extensible, universal interface for the UI automation of potentially
everything! Read on into some of the specific intro docs for more details, or check out the various
guides to dive into some more general concepts and features of Appium.
