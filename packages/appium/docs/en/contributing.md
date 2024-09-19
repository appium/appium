---
hide:
  - navigation

title: Contributing to Appium
---

The Appium project would not exist without the many contributions of code, documentation,
maintenance, and support from companies and volunteers. As such, we welcome contributions!

There are a lot of different ways to help the project - see below for everything you can do and the
processes to follow for each contribution method. Note that no matter how you contribute, your
participation is governed by our [Code of Conduct](https://github.com/appium/appium/blob/master/CONDUCT.md).

## Join the Discussion Forum

You don't need to know the internals of Appium to be able to contribute! If you have experience with
using Appium and feel like sharing your knowledge with others, consider helping out users on the
Appium forums at [discuss.appium.io](https://discuss.appium.io/). Hop on over and see if there are
any questions that you can answer.

## Report Bugs or Feature Requests

If you've encountered a bug, or have a cool feature in mind that you think Appium should support,
make sure to let us know at our [GitHub issue tracker](https://github.com/appium/appium/issues).
Please use the appropriate issue form template when creating your issue.

## Triage Issues

In addition to creating issues, you can also help us investigate already reported issues. All you
need is enough familiarity with Appium to try and reproduce bugs.

You can get started by checking our [GitHub issue tracker](https://github.com/appium/appium/issues)
for issues with labels such as `Needs Triage` or `Needs Info`, and leaving relevant comments:

-   If the issue is a duplicate, drop a link to the original issue
-   If the user has not provided enough information (such as Appium logs), ask them for more details
-   If you can reproduce the problem on your own environment, provide all the information that you think
    would help us track down the cause of the issue

For further information on triaging Appium issues (for any Appium project repository), please contact
any member of the [Technical Committee](https://github.com/appium/appium/blob/master/GOVERNANCE.md#the-technical-committee).

## Contribute Code

We are always open to pull requests for improving the Appium code or documentation!

!!! info

    Developer information may not be kept up to date as frequently as user-facing information, or
    it may be most relevant in its current form on the online repository, not in this published
    version. Make sure to check the repo or discuss with maintainers. We would be glad to help
    new contributors get started!

Start by cloning the repository (we recommend [forking](https://github.com/appium/appium/fork)
it first):
```sh
git clone https://github.com/appium/appium.git
cd appium
```

!!! info

    If you are VS Code user, you can easily check out the project using [Runme](https://runme.dev/api/runme?repository=https%3A%2F%2Fgithub.com%2Fappium%2Fappium.git&fileToOpen=packages%2Fappium%2Fdocs%2Fen%2Fcontributing%2Findex.md).

Install dependencies:
```sh
npm install
```

From here on there are several things you can do.

Build the project:
```sh
npm run build
```

Build the project and watch for changes:
```sh
npm run dev
```

Start the locally built Appium server:
```sh
npm start
```

Run various tests:
```sh
npm run lint
npm run test:unit
npm run test:types
npm run test:smoke
npm run test:e2e
npm run test:quick # unit and types
npm run test:slow # everything
```

You can also run tests for specific workspaces, e.g.:

```sh
export APPIUM_WORKSPACE=@appium/base-driver
npm run test:unit -w $APPIUM_WORKSPACE
```

### Documentation

The documentation for this project is [available in the project repository itself](https://github.com/appium/appium/tree/master/packages/appium/docs).
It is contained in Markdown files, which are built by our documentation system in the
`@appium/docutils` module. This module is based on [MkDocs](https://www.mkdocs.org/) and therefore
requires [Python](https://www.python.org/) to be installed on your system.

Install Python dependencies:
```sh
npm run install-docs-deps
```

After making your changes, you can run the documentation server in dev mode:
```sh
npm run dev:docs
```

You can then view the documentation at `http://127.0.0.1:8000/docs/en`.
