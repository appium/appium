# Plugin: storage

!!! tip

    All these commands can be invoked without creating a session, allowing you to
    prepare your test environment in advance.

### `addStorageItem`

`POST` **`/storage/add`**

Add a new file to the storage

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | the name used to save the file (must not include path separator characters) |
| `sha1` | `string` | SHA1 hash of the file to be uploaded |

#### Example

```bash
curl -X POST --header "Content-Type: application/json" --data '{"name":"app.ipa","sha1":"ccc963411b2621335657963322890305ebe96186"}' http://127.0.0.1:4723/storage/add
```

#### Response

`AddRequestResult`

A JSON object in the following format:
```json
{
  "ws": {
    "stream": "/storage/add/ccc963411b2621335657963322890305ebe96186/stream",
    "events": "/storage/add/ccc963411b2621335657963322890305ebe96186/events"
  },
  "ttlMs": 300000
}
```

| Name | Type | Description |
| :------ | :------ | :------ |
| `ws.stream` | `string` | the pathname of the streaming web socket used to upload the file content |
| `ws.events` | `string` | the pathname of the events web socket used to notify about upload success or a failure |
| `ttlMs` | `number` | the amount of milliseconds both web sockets will be kept active before they expire, or a file payload would be successfully uploaded |


### `listStorageItems`

`GET` **`/storage/list`**

List all files present in the storage

#### Example

```bash
curl http://127.0.0.1:4723/storage/list
```

#### Response

`List<StorageItem>`

A list of items, where each item has the following properties:

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | the name of the file in the storage |
| `path` | `string` | full path to the file on the remote file system |
| `size` | `number` | file size in bytes |

### `deleteStorageItem`

`POST` **`/storage/delete`**

Deletes a file in the storage with the specified name

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | the name of the file to be deleted |

#### Example

```bash
curl -X POST --header "Content-Type: application/json" --data '{"name":"app.ipa"}' http://127.0.0.1:4723/storage/delete
```

#### Response

`boolean`

`false` if the file does not exist in the storage, or `true` upon successful file deletion 

### `resetStorage`

`POST` **`/storage/reset`**

Deletes all uploaded files and stops any incomplete uploads.
If the `APPIUM_STORAGE_KEEP_ALL` flag is enabled, all uploaded files will be preserved,
and only the incomplete uploads will be stopped.

#### Example

```bash
curl -X POST http://127.0.0.1:4723/storage/reset
```

#### Response

`undefined`
