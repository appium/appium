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

Don't use line breaks such as `--` or `---`.

### Linking

Link to the readme:

`[readme](../../README.md)`

Link to contributing:

`[contributing](../../CONTRIBUTING.md)`

Link to another document

`[link text](filename.md)`

### Writing Commands Documents

The command documents located in `docs/en/commands`, are generated
docs and aren't meant to be edited directly. The command documentation is defined in
`commands-yml/commands`.

### Generating Commands Documents

To generate the commands docs, run `npm run generate-docs`. This will generate the markdown
files in `docs/en/commands` and then they need to be committed and pushed.

### Adding Documents to Appium.io

Markdown files in `docs/` aren't automatically added to the site. To add a document to [appium.io](https://appium.io)
you need to add it as an entry in the appropriate location in the table of
contents, [toc.js](https://github.com/appium/appium/blob/master/docs/toc.js)

#### Publishing

To publish documentation on [appium.io](https://appium.io) see [appium.io (Github)](https://github.com/appium/appium.io).
