---
title: Contributing to Appium
---

Appium is open source, available under an Apache 2.0 license. Appium's copyright is held by the
[OpenJS Foundation](https://openjsf.org), and Appium receives contributions from many companies
across several software industries, regardless of their competitive status. (3rd-party drivers and
plugins are available under the licenses provided by their authors.)

As such, we welcome contributions! The project moves forward in relation to the investment of
contributions of code, documentation, maintenance, and support from companies and volunteers.

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

```sh
export GITHUB_USERNAME=<your-username>
git clone git@github.com:$GITHUB_USERNAME/appium.git
```

After cloning you can go ahead and install the project dependencies:

```sh
npm install
```

From here on there are several things you can do.

### Watch Files

When developing Appium code we have to watch all JavaScript and TypeScript files to re-compile them after every change. You can run this watch process via:

```sh
npm run dev
```

### Start Appium in Dev-Mode

To test your changes you can run Appium in dev mode via:

```sh
npm start
```

### Run Tests

The project maintains a set of different test variations you can run to verify the quality of the code.

#### Linting

Appium uses [`eslint`](https://eslint.org/) for static code analysis and linting. You can run these checks via:

```sh
npm run lint
```

#### Unit

```sh
npm run test:unit
```

You can also run tests for specific workspaces, e.g.:

```sh
export APPIUM_WORKSPACE=@appium/doctor
npm run test:unit -w $APPIUM_WORKSPACE
```

#### Smoke and E2E

```sh 
npm run test:slow
```

### Deploy Docs Locally

Our documentation system uses [MKDocs](https://www.mkdocs.org/) and therefore requires [Python](https://www.python.org/) to be installed on your system. You can run the docs by:

```sh
# installing needed Python dependencies
pip install -r packages/docutils/requirements.txt
# build the project
npm run build
# run dev server
npm run dev:docs
```

You should be able to view the page at `http://127.0.0.1:8000/docs/en`:

```sh
open http://127.0.0.1:8000/docs/en
```
