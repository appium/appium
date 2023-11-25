---
title: Contributing to Appium
cwd: ../../../../../
---

This section of Appium's documentation is for those who are interested in contributing to Appium's
development. It contains developer overviews, guides, and notes. Use the navigation menu to find
a specific topic. All the information in these guides assumes in-depth familiarity with Appium
already.

!!! warning

    Developer information may not be kept up to date as frequently as user-facing information, or
    it may be most relevant in its current form on the online repository, not in this published
    version. Always be sure to check the repo or discuss with maintainers. We're always happy to
    help new contributors get started!

## Ways to Contribute

The project offers a variety of ways to contribute, e.g.:

- contributing code
- improving documentation
- creating educational content (blog posts, tutorials, videos, etc.)
- spreading the good word about the project (e.g. via Twitter)
- filing bugs if you discover them while using Appium
- making feature requests if you are missing something in the project or help triaging bugs
- supporting users in the [Appium forum](https://discuss.appium.io/)

## The Appium Development Process

To contribute to the Appium code base make sure to check out the Git repository.

!!! info

    If you are VS Code user you can easily check out the project using [Runme](https://runme.dev/api/runme?repository=https%3A%2F%2Fgithub.com%2Fappium%2Fappium.git&fileToOpen=packages%2Fappium%2Fdocs%2Fen%2Fcontributing%2Findex.md).

It is advised to [fork](https://github.com/appium/appium/fork) before cloning it to your system.

```sh { name=clone }
export GITHUB_USERNAME=<your-username>
git clone git@github.com:$GITHUB_USERNAME/appium.git
```

After cloning you can go ahead and install the project dependencies:

```sh { name=install }
npm install
```

From here on there are several things you can do.

### Watch Files

When developing Appium code we have to watch all JavaScript and TypeScript files to re-compile them after every change. You can run this watch process via:

```sh { name=watch, background=true }
npm run dev
```

### Start Appium in Dev-Mode

To test your changes you can run Appium in dev mode via:

```sh { name=start }
npm start
```

### Run Tests

The project maintains a set of different test variations you can run to verify the quality of the code.

#### Linting

Appium uses EsLint for static code analysis and linting. You can run these checks via:

```sh { name=test-linting }
npm run lint
```

#### Unit

Run via:

```sh { name=test-unit }
npm run test:unit
```

You can also run tests for specific workspaces, e.g.:

```sh { name=test-workspace }
export APPIUM_WORKSPACE=@appium/doctor
npm run test:unit -w $APPIUM_WORKSPACE
```

#### Smoke and e2e Tests

Run via:

```sh { name=test-slow }
npm run test:slow
```
