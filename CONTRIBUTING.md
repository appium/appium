# Contributing to Appium

There are a lot of different ways to contribute to Appium. See below for
everything you can do and the processes to follow for each contribution method.
Note that no matter how you contribute, your participation is governed by our
[Code of Conduct](CONDUCT.md).

### Make changes to the Appium code or docs

Fork the project, make a change, and send a pull request! Please have a look at
our [Style Guide](/docs/en/contributing-to-appium/style-guide.md) before
getting to work.  Please make sure the unit and functional tests pass before
sending a pull request; for more information on how to run tests, keep reading!

Make sure you read and follow the setup instructions in the README first. And note
that all participation in the Appium community (including code submissions) is
governed by our [Code of Conduct](CONDUCT.md). Then, have a look at our
[running from source doc](/docs/en/contributing-to-appium/appium-from-source.md) for more
information on how to get set up to run tests and start slinging code.

You will probably also want to have a look at this more in-depth [Developer's
Overview](/docs/en/contributing-to-appium/developers-overview.md) of the Appium
project, how Appium is architected, how to make changes to modules, and so on.

Finally, before we accept your code, you will need to have signed our
[Contributor License
Agreement](https://cla.js.foundation/appium/appium).

### Become an Appium Triager

You can help us manage our issue tracker! All you need is enough familiarity
with Appium to try and reproduce bugs. We triage issues by having conversations
with the issue creator and then either closing the issue or moving it into the
[Bugs](https://github.com/appium/appium/milestones/Bugs) or
[Features](https://github.com/appium/appium/milestones/Features) milestone. We
use these buckets as the backlogs for our upcoming releases.

We use this "algorithm" for triaging issues, which anyone can jump in and follow:

1. If issue is a feature request, discuss amongst Appium devs.
    * If we decide to build it, add to the Features milestone.
    * If we decide not to build it, just close.
2. If issue is a bug report, attempt to verify
    * If it's a duplicate, close with link to bug already reported.
    * If it ultimately can't be verified, close until we have enough information to verify (e.g., in most cases we need a full set of Appium logs to help diagnose an issue).
    * If the user hasn't provided enough information, keep asking for enough information to verify.
    * If it's a verified new bug, add it to the Bugs milestone.
    * If we have been waiting for a reply from the user for over 3 weeks, close.

If you're interested in joining our triage rotation, contact
[@jlipps](https://github.com/jlipps) or
[@imurchie](https://github.com/imurchie).

### Help out on our forums

We can always use help on our forums at
[discuss.appium.io](https://discuss.appium.io)! Hop on over and see if there
are any questions that you can answer.

### Submit bug reports or feature requests

Just use the GitHub issue tracker to submit your bug reports and feature
requests. If you are submitting a bug report, please follow the [issue template](https://github.com/appium/appium/issues/new).
