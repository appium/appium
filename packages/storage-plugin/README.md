# Storage Plugin

The purpose of Storage plugin is to create server-side file storage.
This allows to manage various files, like application packages,
from the client side. Only one storage may exist per server process,
shared by all testing sessions.

## Installation

```bash
appium plugin install --source=npm @appium/storage-plugin
```

## Usage

Add the plugin name to the list of plugins to use upon server startup:

```bash
appium --use-plugins=storage
```

By default, the plugin created a new temporary folder where it manages uploaded files.
It is also possible to customize this folder by assigning a custom path to the
`APPIUM_STORAGE_ROOT` environment variable. The plugin automatically deletes the
root folder recursively upon server process termination, unless the server is
killed forcefully. If `APPIUM_STORAGE_ROOT` points to folder, which already exists,
then only files managed by the plugin lifecycle are going to be deleted upon storage
reset or upon server process termination.

After the plugin is activated you may use the following BiDi commands from your test sessions:

### appium:storage.upload

The purpose of this command is to upload files to the remote storage partially
to avoid excessive memory usage. In order to upload a file from a local file system
to the Appium server's file system it is necessary to perform following steps:

- Calculate the size of the source file
- Calculate [SHA1](https://en.wikipedia.org/wiki/SHA-1#:~:text=In%20cryptography%2C%20SHA%2D1%20(,rendered%20as%2040%20hexadecimal%20digits.) hash of the source file
- Start reading the source file into small chunks. The recommended size of a single chunk is 64 KB.
  The overall chunk size before encoding to base64 must not be greater than 512 KB.
- After each chunk is retrieved call `appium:storage.upload` BiDi command and pass
  the following parameters to it:
  - `name` (required): The destination file name. It could be the same as the local one. Must not include any path separator characters.
  - `size` (required): The total size of the destination file in bytes. Must be the same as the size of the source file.
  - `hash` (required): SHA1 hash of the destination file. Must be the same as the size of the source file. Used to verify the uploaded file after all chunks are sent to the server.
  - `chunk` (required): Base64-string encoded payload of the source file buffer.
  - `position` (required): The absolute position of the buffer in the source file in bytes. Must be less than the file size.
- After the last chunk upload is completed and hash validation succeeds the uploaded file should
  appear in the [list](#appiumstoragelist) API output.

It is also possible to upload multiple files in parallel.
Only plain files hierarchy is supported in the storage, no subfolders are allowed.

### appium:storage.list

Lists all files previously uploaded to the storage. Only completed file uploads are listed.
The result of calling this API is a list of items, where each item has the following properties:

- `name` (string): The name of the file in the storage
- `path` (string): Full path to the file on the remote file system
- `size` (number): File size in bytes

### appium:storage.delete

Deletes an existing storage file. If a file with the given name is not present in the storage
then this API returns `false`, otherwise `true` upon successful file deletion.

Accepted parameters:

- `name` (required): The name of the file in the storage to be deleted

### appium:storage.reset

Resets the server storage by deleting all uploaded files as well as incomplete uploads.

## CDDL Definitions

Check the [BiDi Commands Exported By The Storage Plugin](./docs/bidi.md) document.

## License

Apache-2.0
