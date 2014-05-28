# How to write docs

`#` is used to write a h1 header. Each document must start with a h1 header.
Don't use the `===` underline method of creating headers.

## Subheaders

`##` is used to write subheaders. Don't use the `---` underline method of
creating sub headers.

### Regular headers

`###` is used for headers that don't appear in the table of contents.
Don't use h4 `####`, h5 `#####`, or h6 `######`.

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