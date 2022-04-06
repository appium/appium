---
title: Appium Project History
---

Appium has been around in one form or another since 2012. It's been under the
direction of various individuals and organizations, and it's even been
implemented in 3 different programming languages! Welcome to more than you ever
wanted to know about how Appium got to be what is it today...

## Early Inspiration

[Dan Cuellar](https://twitter.com/thedancuellar) was the Test Manager at Zoosk
in 2011, when he encountered a problem. The length of the test passes on the
iOS product was getting out of hand. Less testing was an option, but would come
with additional risk, especially with it taking several days to get patches
through the iOS App Store Review process. He thought back to his days working
on websites and realized automation was the answer.

Dan surveyed the existing landscape of tools, only to find that all of them
hand major drawbacks. The tool supplied by Apple, UIAutomation, required tests
to be written in JavaScript, and did not allow for real-time debugging or
interpretation. It also had to be executed inside the Xcode profiling tool,
Instruments. Other 3rd-party tools used private APIs and required SDKs and HTTP
Servers to be embedded into the application. This seemed highly undesirable.

Unsatisfied with the existing options, Dan asked his manager for some
additional time to see if he could find a better way. He spent 2 weeks poking
and prodding around to see if there was a way to use approved Apple
technologies to automate an iOS application. The first implementation he tried
used AppleScript to send messages to Mac UI elements using the OS
X accessibility APIs. This worked to some degree, but would never work on real
devices, not to mention other drawbacks.

So he thought, what if I could get the UIAutomation framework to run in real
time like an interpreter? He looked into it and he determined that all he would
need to do is find a way to receive, execute, and reply to commands from within
a UIAutomation javascript program. Using the utility Apple provided for
executing shell commands he was able to `cat` sequentially ordered text files
to receive commands, `eval()` the output to execute them, and write them back
to disk with `python`. He then prepared code in C# that implemented the
Selenium-style syntax to write the sequentially ordered javascript commands.
iOSAuto is born.

## Selenium Conference 2012

Dan was selected to speak at Selenium Conference 2012 in London about an
entirely different topic. As part of his presentation, he showed off iOS
Automation using Selenium syntax to demonstrate writing platform-agnostic tests
that use separate platform-specific page objects with a common interface. To
his surprise, the cool test architecture would take a backseat to the spectacle
of iOS tests running like WebDriver tests. Several people suggested that he
give a lightning talk later in the conference to explain exactly how it worked.

On the second day of the conference, Dan stepped up on stage to give the
lightning talk.  Jason Huggins, co-creator of Selenium, moderated the lightning
talks.  Dan experienced technical difficulties getting his presentation to
load, and Jason nearly had to move on to the next lightning talk.  At the last
moment, the screen turned on and Dan jumped into his presentation. He explained
the details of his implementation and how it worked, begged for contributors,
and in five minutes it was over. The crowd applauded politely, and he left the
stage.

## The Phone Rings

Four months after the Selenium Conference, Jason called Dan. Jason had been
working on iOS testing support for a client at Sauce Labs.  Jason remembered
Dan's lightning talk and thought the project might be useful to Jason's work,
but Dan's source code was not public. Jason asked Dan to meet up.  Later that
week, Dan met Jason in a bar in San Francisco and showed him the source code
for iOS Auto.

A long-time open source advocate, Jason encouraged Dan to release his code
under an open source license.  In August, Dan [released the source
code](https://github.com/penguinho/appium-old/commit/3ab56d3a5601897b2790b5256351f9b5af3f9e90)
on GitHub in C#. Jason encouraged Dan to change the language to make the
project more appealing to potential contributors. Dan [uploaded a new version
in
Python](https://github.com/penguinho/appium-old/commit/9b891207be0957bf209a77242750da17d3eb8eda).
In September, Jason added a web server and [began to implement the WebDriver
wire
protocol](https://github.com/hugs/appium-old/commit/ae8fe4578640d9af9137d0546190fa29317d1499)
over HTTP, making iOS Auto scriptable from any Selenium WebDriver client
library in any language.

## The Mobile Testing Summit

Jason decided that the project should be presented at the [Mobile Testing
Summit](https://twitter.com/mobtestsummit) in November, but suggested that the
project get a new name first. Many ideas were thrown out and they settled on
AppleCart. A day later, while he was perusing some of Apple's guidance on
copyright and trademarks, Jason noticed that under the section of examples for
names Apple would defend its trademarks against, the first example was
"AppleCart". He called Dan and informed him of the situation, and they
brainstormed for a bit before Jason hit the jackpot. Appium... Selenium for
Apps.

## Sauce Labs and Node.js

In January 2013, not long after the Mobile Testing Summit, Sauce Labs decided
to fully back Appium and provide more developer power. A task force was created
to evaluate the current state and how best to move forward with the project.
The team, which included Jonathan Lipps (the current project lead), decided
that Appium needed a rebirth, and ultimately settled on Node.js as the
framework to use. Node is well-known as a fast and efficient web server
backend, and at the end of the day, Appium is just a highly-specialized web
server. It was also decided that JavaScript as a language was accessible enough
that Appium would be able to grow into a larger community of open-source
developers with JavaScript than the other options on the table.

In just a few days, the team leveraged the existing work on Appium and had
a new version of Appium with as much functionality as the previous Python
version. The foundation had been laid for Appium's basic architecture, and we
have been successfully building on it since. A few weeks into this sprint,
Jonathan Lipps was formally designated project lead and he began to strategize
how to get more people from the community involved with Appium's development.

## Appium Around the World

Ultimately, Jonathan decided that getting Appium in front of as many developers
at conferences and meetups was the best way to attract users and contributions.
Appium in its new incarnation was debuted at the [Google Test Automation
Conference 2013](https://www.youtube.com/watch?v=1J0aXDbjiUE). Later in 2013,
Appium was presented at conferences and meetups all around the US, as well as
in England, Poland, Portugal, and Australia. Notably, Jonathan had Appium
[perform as instruments in a band](https://www.youtube.com/watch?v=zsbNVkayYRQ)
and Dan Cuellar put together a fun [Appium video
montage](https://www.youtube.com/watch?v=xkzrEn0v0II) for Selenium Conference.

But during all these presentations and conferences, the project continued to
develop. Early in 2013 we released Android and Selendroid support, making
Appium the first truly cross-platform automation framework. The project also
continued to attract users and contributors, and by the end of 2013, we'd
already had well over 1,000 commits.

## The Road to Appium 1.0

Appium began to grow and mature significantly. In May 2014,
we released Appium 1.0, which stood as a milestone in Appium's development.
Appium was given
[various](http://sauceio.com/index.php/2014/01/appium-selected-as-a-black-duck-open-source-rookie-of-the-year/)
[awards](http://sauceio.com/index.php/2014/10/appium-wins-a-bossy-award-from-infoworld/)
and became the most popular open-source cross-platform mobile automation
framework. Stability improved, bugs were prioritized and fixed, and features
added. Sauce Labs increased the number of developers it donated to working
on Appium, but the entire community stayed involved in guiding the project and
contributing to it, and project governance continued to happen in the open, on
public mailing lists and GitHub's issue tracker.

## The Appium Umbrella Broadens

Eventually, it became clear that the Appium codebase was not optimized for
a large team of distributed, sometime contributors. We took the opportunity as
a committer team to rewrite Appium from the ground up, using a more modern
version of the JavaScript language, and redoing Appium's architecture so that
it was easy for users or third-party developers to build their own Appium
"drivers". We wanted for it to be easier for new contributors to get ramped up
on the Appium codebase, and to see support for new platforms added to Appium by
groups other than the core team. That vision has begun to be fulfilled, with
groups like Microsoft and Youi.tv adding drivers to Appium for Windows desktop
app automation and Youi.tv app automation, respectively. Who knows what
platforms will be added next?

## Appium To The People

In late 2016, Sauce Labs donated Appium as a project to the [JS
Foundation](https://js.foundation), in order to cement for the world Sauce's
commitment that Appium remains open source. The JS Foundation is a non-profit
open source stewardship organization which takes responsibility for holding the
copyright for open source projects, as well as ensuring they have a long and
successful tenure in the community. As a result of our move to a non-profit
foundation, we hope that the door will open even more widely for new
contributors, either as individuals or representing one of the many companies
which now have an interest in seeing Appium move forward.

Eventually, the JS Foundation merged into the [OpenJS Foundation](https://openjsf.org), and Appium
is currently an Impact Project in the foundation.

## Appium 2.0

Appium 2.0 was released in 2022, with a new focus on Appium as an ecosystem rather than a singular
project. Drivers and plugins can be developed and shared by anyone, opening up a world of
possibilities for automation-related development for platforms far beyond iOS and Android.
