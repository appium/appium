# @appium/storage-plugin

> Appium plugin for server-side file storage

This plugin adds the ability to create a dedicated storage space on the server side,
which can be managed from the client side. This can be useful for files like application packages.
Only one storage may exist per server process, shared by all testing sessions.

> [!WARNING]
> This plugin is designed to be used with servers deployed in private networks.
> Consider validating the setup with your security department
> if you want to enable this plugin at a public Appium server deployment.

## Installation

```bash
appium plugin install storage
```

## Usage

Add the plugin name to the list of plugins to use upon server startup:

```bash
appium --use-plugins=storage
```

By default, the plugin creates a new temporary folder where it manages uploaded files.

[Refer to the Appium documentation for a list of commands supported by this plugin.](https://appium.io/docs/en/latest/commands/storage-plugin/)

### Storing a File

The procedure for storing a local file on the Appium server is as follows:

- Calculate the [SHA1](https://en.wikipedia.org/wiki/SHA-1) hash of the source file
- Decide the name of the destination file in the server storage (it can be the same as the original file name)
- Send a `POST` request to the `/storage/add` endpoint, which will return the `events` and `stream` websocket paths
- Connect to both web sockets
- Start listening for messages on the `events` web socket. Each message there is a JSON object wrapped
  to a string. The message must be either `{"value": {"success": true, "name":"app.ipa","sha1":"ccc963411b2621335657963322890305ebe96186"}}` to notify about a successful
  file upload, or `{"value": {"error": "<error signature>", "message": "<error message>", "traceback": "<server traceback>"}}`
  to notify about any exceptions during the upload process.
- Start reading the source file into small chunks. The recommended size of a single chunk is 64 KB.
- After each chunk is retrieved, pass it to the `stream` web socket.
- After the last chunk upload is completed, either close the `stream` web
  socket to explicitly notify the server about the upload completion, or
  wait until the success event is delivered from the `events` web socket
  as soon as file hashes successfully match.
  The server must always deliver either a success or a failure
  event via the `events` web socket as described above.

It is also possible to upload multiple files in parallel (up to 20 jobs are supported).
Only flat files hierarchies are supported in the storage, no subfolders are allowed.
If a file with the same name already exists in the storage, it will be overridden with the new one.
If a folder with the same name already exists in the storage, an error will be thrown.

### Environment Variables

#### APPIUM_STORAGE_ROOT

It is also possible to customize the repository root folder path by assigning a custom path to the
`APPIUM_STORAGE_ROOT` environment variable upon server startup. The plugin automatically deletes the
root folder recursively upon server process termination, unless the server is
killed forcefully. If `APPIUM_STORAGE_ROOT` points to an existing folder,
then all files there are going to be preserved by default unless a different behavior is
requested by [APPIUM_STORAGE_KEEP_ALL](#appium_storage_keep_all) environment variable value.

#### APPIUM_STORAGE_KEEP_ALL

If this environment variable is set to `true`, `1` or `yes` then the plugin will always keep
storage files after the server process is terminated. All other
values of this variable enforce the plugin to always delete all files
from the storage folder.

## Examples

Check [integration tests](./test/e2e/storage.e2e.spec.cjs) for a working
[WebdriverIO](https://webdriver.io/) example.

## License

Apache-2.0
