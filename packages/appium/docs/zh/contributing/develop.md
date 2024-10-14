---
title: Contributing Code
---

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
pip install -r packages/docutils/requirements.txt --break-system-packages
# build the project
npm run build
# run dev server
npm run dev:docs
```

You should be able to view the page at `http://127.0.0.1:8000/docs/en`:

```sh
open http://127.0.0.1:8000/docs/en
```
