---
title: Building Docs for Appium Extensions
---

Once you've [built a driver](./build-drivers.md) or [built a plugin](./build-plugins.md) for
Appium, you will hopefully want to document how that extension works for your users. The most basic
way of doing this is to write up a quick README and keep it in the root of your project's
repository. However, this can involve a lot of duplication of effort, especially when documenting
things like Appium commands.

Let's say your driver implements ~25 of the standard WebDriver protocol commands. You could write
up a description of these commands, how they map to the protocol, what parameters they take, and
what behaviour will result on your particular platform. But this information is already more or
less stored in your code, as the command implementation (and any docstrings or comments). Having
this information in two places creates an opportunity for the docs to get out of sync with the
reality of the code. Wouldn't it be nice to generate command reference documentation straight from
the code?

Another problem with the basic single file README approach is that many extensions might want
a whole set of documents including longer prose guides (like this one). It might be nice to have
code examples where you can toggle between different programming languages. It might be nice to be
able to add a project-specific logo. And so on.

Luckily, the Appium project has built tools to do all these things, and we've packaged up these
tools so our ecosystem developers building drivers and plugins can _also_ use them. The best way to
get going with these tools is probably to look at an existing Appium driver repo to see how it's
done, for example the [XCUITest driver repo](https://github.com/appium/appium-xcuitest-driver). But
this guide will outline the basic approach.

### Conceptual architecture

Appium settled on [MkDocs](https://www.mkdocs.org/) as a Markdown-based documentation site
generator. It uses a Python toolchain (and not Node.js), but it turned out to be the best option
for our purposes. You can adjust this, but by default Appium's utilities also assume that you'll be
using the [mkdocs-material](https://squidfunk.github.io/mkdocs-material/) theme/extension for
MkDocs.

From here, building a basic docs site is as easy as collecting your Markdown files together and
creating a sort of manifest file defining how you want them to be organized.

The other main piece is automatic documentation generation from your code files. Appium maintains
a plugin for [TypeDoc](https://typedoc.org/). This plugin is incorporated into our doc utility.
When you give it an entrypoint for you driver or plugin, it will scan and parse all your code files
looking for Appium command implementations. A set of Markdown reference files will be generated for these
commands, which can then be included in your docs site.

In order to make different versions of your docs available (one for each minor release of your
extension, typically), we also bundle [Mike](https://github.com/jimporter/mike).

### Setup

To take advantage of Appium's documentation utilities, you'll need to make sure of the following:

- Python 3 is available
- The appropriate Python dependencies are available (the versions used by Appium itself are listed
- in the doc utility's
  [requirements.txt](https://github.com/appium/appium/blob/master/packages/docutils/requirements.txt)).
  It's recommended you use the same versions.
- Include the `@appium/docutils` NPM package as a dev dependency of your project
- Annotate your commands using TypeDoc (this works for JS projects and not just TypeScript
  projects).
- Put your markdown docs files in a directory
- Create a [`mkdocs.yml`](https://www.mkdocs.org/user-guide/configuration/) file that extends
  Appium's base MkDocs configuration. (If your `mkdocs.yml` file is in the root of your repo, then
  the line at the top of it should look like:
  ```yml
  INHERIT: ./node_modules/@appium/docutils/base-mkdocs.yml
  ```
  Basically, make sure you're inheriting the path to `@appium/docutils`'s `base-mkdocs.yml`.


### Usage

At this point, you can use the `appium-docs` CLI tool. Run this tool with no arguments to get the
full help output and see all the available subcommands and parameters. Here are a few usage
examples:

```bash
# Generate reference and build the mkdocs site into the site dir
appium-docs build

# Same as build, but host the docs on a local dev server
# and watch for changes and rebuild when files change
appium-docs build --serve

# Build the docs and deploy them with mike versioning to the docs-site branch
# using the included commit message and rebase strategy on the branch.
# This is particularly useful for pushing content to a GitHub pages branch!
appium-docs build \
  --deploy \
  -b docs-site \
  -m 'docs: auto-build docs for appium-xcuitest-driver@%s' \
  --rebase
```
