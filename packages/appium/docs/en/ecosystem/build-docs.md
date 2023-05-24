---
title: Building Docs for Appium Extensions
---

Once you've [built a driver](./build-drivers.md) or [built a plugin](./build-plugins.md) for Appium,
you will hopefully want to document how that extension works for your users. The most basic way of
doing this is to write up a quick `README.md` and keep it in the root of your project's repository.
However, this can involve a lot of duplication of effort, especially when documenting things like
Appium commands.

Let's say your driver implements ~25 of the standard WebDriver protocol commands. You could write
up a description of these commands, how they map to the protocol, what parameters they take, and
what behaviour will result on your particular platform. But this information is already more or
less stored in your code, as the command implementation (and any docstrings or comments). Having
this information in two places creates an opportunity for the docs to get out of sync with the
reality of the code. Wouldn't it be nice to generate command reference documentation straight from
the code?

Another problem with the basic single file `README.md` approach is that many extensions might want a
whole set of documents including longer prose guides (like this one). It might be nice to have code
examples where you can toggle between different programming languages. It might be nice to be able
to add a project-specific logo. And so on.

The Appium project has built tools to do all these things, and we've packaged up these tools so our
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

From here, building a basic docs site is as easy as collecting your Markdown files together and
creating a sort of manifest file defining how you want them to be organized.

The other main piece is automatic documentation generation from your code files. Appium maintains
a plugin for [TypeDoc](https://typedoc.org/). This plugin is incorporated into our doc utility.
When you give it an entrypoint for you driver or plugin, it will scan and parse all your code files
looking for Appium command implementations. A set of Markdown reference files will be generated for these
commands, which will then be included in your docs site.

> Note: Implementing an extension in TypeScript is _not_ a requirement for generating documentation,
> but for automated doc generation to work, you will need to apply TypeScript-supported JSDoc-style
> docstrings to your JS codebase.  See ["JS Projects Utilizing TypeScript"](https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html) for more information.

In order to make different versions of your docs available (one for each minor release of your
extension, typically), we also bundle [Mike](https://github.com/jimporter/mike).

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
npx appium-docs init --entry-point <my-entry-point.js>
```

...where `<my-entry-point.js>` is the **source entry point** to your extension. If you _are not_ transpiling your code via TypeScript, Babel, etc., this is typically the same as the value of the `main` property in `package.json`.  If you _are_ transpiling, this is typically different.  For example, your `main` property may be `dist/index.js`, but your **source entry point** is `src/index.ts`.

This will:

1. Create a `tsconfig.json` if one does not already exist. This is necessary even if your extension is not written in TypeScript.
2. Create a `typedoc.json` with the necessary configuration for TypeDoc.
3. Create a `mkdocs.yml` with the necessary configuration for MkDocs.
4. Modify your `package.json` to add a `typedoc.entryPoint` property with a value of your entry point (as specified above).

### Documenting Your Extension

At this point, you can begin documenting your extension.  You don't need to do this all at once, but you should make the following changes, at minimum.

#### `newMethodMap` and `executeMethodMap`

The static properties `newMethodMap` and `executeMethodMap` may be present on your extension's main class.  If they are not, then you can skip to the next section.  If they are, you will need to make the following changes, depending on your extension's language.

##### JavaScript

```js
// note: this is equivalent to the TypeScript example below

class MyExtension {
  static newMethodMap = /** @type {const} */({
    // ...
  });
  
  static executeMethodMap = /** @type {const} */({
    // ...
  });
}

```

##### TypeScript

```ts
class MyExtension {
  static newMethodMap = {
    // ...
  } as const;

  static executeMethodMap = {
    // ...
  } as const;
}
```

#### Driver Constraints

> Note: Plugin authors can skip this section.

Your driver may have a property `desiredCapConstraints`. It should also follow the same pattern as `newMethodMap` and `executeMethodMap` above.  For example:

```js
class MyExtension {
  desiredCapConstraints = /** @type {const} */({
    myCapability: {
      presence: true,
      isString: true
    },
    myOtherCap: {
      isBoolean: true
    }
  });
}
```

(For extensions written in TypeScript, use `as const` as before.)

#### Commands

The documentation for a command, as defined in your extension, comes from multiple places. These sources are then combined as needed into the final output.

In Appium, new commands are defined in `newMethodMap` and execute methods are defined in `executeMethodMap`.  **The value of these properties are used to build your documentation.**  In particular, parameter names and optional/required status _override_ whatever method implementation does.  So for example, if your `newMethodMap` contains:

```js
class MyExtension {
  static newMethodMap = /** @type {const} */({
    '/session/:sessionId/myThing': {
      /**
       * Does my thing
       */
      GET: {command: 'doMyThing', payloadParams: {required: ['a', 'b']}},    
    }
  })
}
```

...and your `doMyThing` method implementation looks like this:

```js
class MyExtension {
  /**
   * Doesn't do my thing
   * @param {any} a - Whatever
   * @param {number} d - Some number
   * @param {boolean} c - Some boolean
   * @returns {Promise<boolean>} Some other boolean
   */
  async doMyThing(a, d = 1, c = false) {
    // ...
    return true;
  }
}
```

The documentation will show that the `doMyThing` method accepts required parameters `a` and `b`. Even though `b` is named `d` in the implementation--and it's optional--it will be ignored. Likewise, since the definition in `newMethodMap` knows nothing about `c`, it too is ignored.

In addition, the _description_ from the docstring in `newMethodMap` overrides the description in the method implementation; it will describe the command `doMyThing` as "Does my thing".

Finally, the `@param` tags and `@returns` tag from the docstring in `newMethodMap` provides further information where `newMethodMap` cannot; e.g., each parameter has a type and description.

All commands must be `async`, so they will return `Promise<T>` where type `T` is the type of whatever the `Promise` fulfills with.  In the generated documentation, the `Promise` is ignored, and only `T` is reported.  So for `doMyThing`, the return type of the command, as output in the documentation, will be `boolean`.  

This is because while extensions must be written in JavaScript, we're documenting an API which can be called from any language; that language likely won't have a concept of a `Promise`.  Likewise, `undefined` or `void` types will be output as `null` (since that is a concept that translates well to multiple languages).

#### Optional: `README.md`

If you have a `README.md`, it will be pulled in to the generated docs site automatically.  This behavior can be disabled by adding the following to `typedoc.json`:

```json
{
  "readme": "none"
}
```

#### Next Steps

Appium provides type definitions for extension authors; these are available via Appium itself and the [`@appium/types`](https://npm.im/@appium/types) package.

Of note, drivers should both extend `BaseDriver` _and_ implement the `ExternalDriver` interface exported by `@appium/types`.  This will help ensure that your driver's implementation is correct and usable by different clients.

You're encouraged to look at the official test/example extensions, [`@appium/fake-driver`](https://npm.im/@appium/fake-driver) and [`@appium/fake-plugin`](https://npm.im/@appium/fake-plugin) for canonical examples of how to use these types.  

#### Resources

How to type more complex return values or parameters is beyond the scope of this document. For more information, see:

- For extensions written in JS, the [TypeScript documentation](https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html)
- For tags in addition to what TS natively recognizes, see the [TypeDoc documentation](https://typedoc.org/guides/doccomments/)

Likewise, refer to the [MkDocs documentation](https://www.mkdocs.org/user-guide/writing-your-docs/) for further information on how to customize your MkDocs output.

### Usage

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
# using the included commit message and rebase strategy on the branch.
# This is particularly useful for pushing content to a GitHub pages branch!
npx appium-docs build \
  --deploy \
  -b docs-site \
  -m 'docs: auto-build docs for appium-xcuitest-driver@%s' \
  --rebase
```
