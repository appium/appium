---
title: Building Documentation
---

Once you've [built a driver](./build-drivers.md) or [built a plugin](./build-plugins.md) for Appium,
you will hopefully want to document how that extension works for your users. The most basic way of
doing this is to write up a quick `README.md` and keep it in the root of your project's repository.
However, this can involve a lot of effort.

The Appium project has built tools to help with this, and we've packaged up these tools so our
ecosystem developers building drivers and plugins can _also_ use them. The best way to get going
with these tools is probably to look at an existing Appium driver repo to see how it's done, for
example the [XCUITest driver repo](https://github.com/appium/appium-xcuitest-driver). But this guide
will outline the basic approach.

### Conceptual architecture

Appium settled on [MkDocs](https://www.mkdocs.org/) as a Markdown-based documentation site
generator. It uses a Python toolchain (and not Node.js), but it turned out to be the best option
for our purposes. You can adjust this, but by default Appium's utilities also assume that you'll be
using the [mkdocs-material](https://squidfunk.github.io/mkdocs-material/) theme/extension for
MkDocs.

In order to make different versions of your docs available (one for each minor release of your
extension, typically), we also bundle [Mike](https://github.com/jimporter/mike).

From here, building a basic docs site is as easy as collecting your Markdown files together and
defining how you want them to be organized.

### Prerequisites

To take advantage of Appium's documentation utilities, you'll need to install:

- [Python v3+](https://www.python.org/downloads/)
- [pip](https://pip.pypa.io/en/stable/installation/) (this may be installed automatically with Python)
- The `@appium/docutils` package:

    ```bash
    npm install --save-dev @appium/docutils
    ```

### Initializing an Extension for Building Docs

To prepare your extension for generating documentation, run the following command:

```bash
npx appium-docs init
```

This will:

1. Create a `tsconfig.json` if one does not already exist. This is necessary even if your extension
is not written in TypeScript.
2. Create a `mkdocs.yml` with the necessary configuration for MkDocs.

### Documenting Your Extension

At this point, you can begin documenting your extension. By default, MkDocs will look for Markdown
files in the `docs` directory. You can therefore create your Markdown documentation files, place
them in `docs`, and add links to these files in `mkdocs.yml`.

Refer to the [MkDocs documentation](https://www.mkdocs.org/user-guide/writing-your-docs/) for
information on how to organize and structure your documentation. 

### Building the Docs

At this point, you can use the `appium-docs` CLI tool. Run this tool with no arguments to get the
full help output and see all the available subcommands and parameters. Here are a few usage
examples:

```bash
# Generate reference and build the mkdocs site into the site dir
npx appium-docs build

# Same as build, but host the docs on a local dev server
# and watch for changes and rebuild when files change
npx appium-docs build --serve

# Build the docs and deploy them with mike versioning to the docs-site branch
# using the included commit message.
# This is particularly useful for pushing content to a GitHub pages branch!
npx appium-docs build \
  --deploy \
  -b docs-site \
  -m 'docs: auto-build docs for appium-xcuitest-driver@%s'
```
