## How to write docs

`##` is used to write a h2 header. Each document must start with a h2 header.
This is to support appium.io docs generation. Don't use the `---` underline method of creating headers.
Don't use h1 `#` or `===` for heading as it is not supported for table of contents (folder name is used as h1).

### Subheaders

`###` is used to write subheaders.

### Regular headers

`####` is used for headers that don't appear in the table of contents.
Don't use h5 `#####`, or h6 `######`.

### Line breaks

Don't use line breaks such as `--` or `---`. This will confuse Slate.

### Linking

Link to the readme:

`[readme](../../README.md)`

Link to contributing:

`[contributing](../../CONTRIBUTING.md)`

Link to another document

`[link text](filename.md)`

To link inside a document, use the `#` from the Slate URL.

`[go direct to json](filename.md#json-wire-protocol-server-extensions)`

Note that hash links will break when the heading changes so linking to
the start of the doc is preferable (`other.md` instead of `other.md#something`).

### Compatibility with appium.io

#### Center aligning code in appium.io

Appium.io documentation uses [slate](https://github.com/tripit/slate) for documentation.
If code snippet in documentation is not language specific or if you want code snippet to stay
along with text in center in appium.io documentation, use center as language in fenced code block.

Example:

    ```center
    code snippet goes here.
    ```

#### Publishing

To publish documentation on appium.io see [api-docs](https://github.com/appium/api-docs) and [appium.io](https://github.com/appium/appium.io).
