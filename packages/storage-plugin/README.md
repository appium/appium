# Storage Plugin

The purpose of Storage plugin is to create server-side file storage.
This allows to manage various files, like application packages,
from the client side. Only one storage may exist per server process,
shared by all testing sessions.

> [!WARNING]
> This plugin is designed to be used with servers deployed in private networks.
> Consider validating the setup with your security department
> if you want to enable this plugin at a public Appium server deployment.

## Installation

```bash
appium plugin install --source=npm @appium/storage-plugin
```

## Usage

Add the plugin name to the list of plugins to use upon server startup:

```bash
appium --use-plugins=storage
```

By default, the plugin creates a new temporary folder where it manages uploaded files.

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

After the plugin is activated you may use the following API endpoints at your Appium server.
These APIs are not connected to sessions and might be invoked without creating a test session.
Such design allows to prepare the testing environment in the `before` hook prior to
creating any driver instances.

### POST /storage/add

```bash
curl -X POST --header "Content-Type: application/json" --data '{"name":"app.ipa","sha1":"ccc963411b2621335657963322890305ebe96186"}' http://127.0.0.1:4723/storage/add
```

The purpose of this command is to upload files to the remote storage partially
to avoid excessive memory usage. In order to upload a file from a local file system
to the Appium server's file system it is necessary to perform following steps:

- Calculate [SHA1](https://en.wikipedia.org/wiki/SHA-1) hash of the source file
- Decide the name of the destination file in the server storage. It might be the same as the original file name.
- Perform a request to this endpoint to notify the server about the intention to add a new storage item where parameters are:
  - `name` (required): The destination file name. It could be the same as the local one. Must not include any path separator characters.
  - `sha1` (required): SHA1 hash of the destination file. Must be the same as the hash of the source file. Used to verify the uploaded file after all chunks are sent to the server.
- The received response is a JSON that looks like

  ```json
  {
    "ws": {
      "stream": "/storage/add/ccc963411b2621335657963322890305ebe96186/stream",
      "events": "/storage/add/ccc963411b2621335657963322890305ebe96186/events"
    },
    "ttlMs": 300000
  }
  ```

  where:
  - `ws.stream`: the pathname of the streaming web socket used to upload the file content
  - `ws.events`: the pathname of the events web socket used to notify about upload success or a failure
  - `ttlMs`: the amount of milliseconds both web sockets will be kept active before they expire, or a file
  payload would be successfully uploaded
- Connect to both web sockets.
- Start listening for messages on the `events` web socket. Each message there is a JSON object wrapped
  to a string. The message must be either `{"value": {"success": true, "name":"app.ipa","sha1":"ccc963411b2621335657963322890305ebe96186"}}` to notify about a successful
  file upload, or `{"value": {"error": "<error signature>", "message": "<error message>", "traceback": "<server traceback>"}}`
  to notify about any exceptions during the upload process.
- Start reading the source file into small chunks. The recommended size of a single chunk is 64 KB.
- After each chunk is retrieved pass it to the `stream` web socket.
- After the last chunk upload is completed either close the `stream` web
  socket to explicitly notify the server about the upload completion, or
  wait until the success event is delivered from the `events` web socket
  as soon as file hashes successfully match.
  The server must always deliver either a success or a failure
  event via the `events` web socket as described above.

It is also possible to upload multiple files in parallel (up to 20 jobs are supported).
Only flat files hierarchies are supported in the storage, no subfolders are allowed.
IF a file with the same name already exists in the storage, it will be overridden with the new one.
If a folder with the same name already exists in the storage, an error will be thrown.

### GET /storage/list

```bash
curl http://127.0.0.1:4723/storage/list
```

Lists all files that are present in the storage folder.
Incomplete uploads are excluded from this list.
The result of calling this API is a list of items, where each item has the following properties:

- `name` (string): The name of the file in the storage
- `path` (string): Full path to the file on the remote file system
- `size` (number): File size in bytes

### POST /storage/delete

```bash
curl -X POST --header "Content-Type: application/json" --data '{"name":"app.ipa"}' http://127.0.0.1:4723/storage/delete
```

Deletes an existing storage file. If a file with the given name is not present in the storage
then this API returns `false`, otherwise `true` upon successful file deletion.

Accepted parameters:

- `name` (required): The name of the file in the storage to be deleted

### POST /storage/reset

```bash
curl -X POST http://127.0.0.1:4723/storage/reset
```

Resets the server storage by deleting all uploaded files as well as incomplete uploads.
If [APPIUM_STORAGE_KEEP_ALL](#appium_storage_keep_all) flag is enabled then
only the latter is going to be cleaned up.

## Examples

Check [integration tests](./test/e2e/storage.e2e.spec.cjs) for a working
[WebdriverIO](https://webdriver.io/) example.

## License

Apache-2.0
