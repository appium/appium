## Pushing/Pulling files

Appium provides [Pull Folder](http://appium.io/docs/en/commands/device/files/pull-folder/), [Pull File](http://appium.io/docs/en/commands/device/files/pull-file/) and [Push File](http://appium.io/docs/en/commands/device/files/push-file/) to move files.
This documentation aims to help to understand how they work for iOS.

### Format

Below is the basic format.

1. `@<app_bundle_id>:<optional_container_type>/<path_to_the_file_or_folder_inside_container>`
2. `@<app_bundle_id>/<path_to_the_file_or_folder_inside_container>`
3. `<path_to_the_file_or_folder_inside_container>`

### Real device

For real devices, Appium relies on [ifuse](https://github.com/libimobiledevice/ifuse) to achieve the feature.
You may compile ifuse from the source code or via brew.

```
$ brew cask install osxfuse
$ brew install ifuse --HEAD # newer iOS versions need the latest codebase
```

#### Format

The format of method argument should be the following:

- `@<app_bundle_id>` is the application bundle identifier
- `optional_container_type` is the container type
    - `documents` is the only available option
        - You may specify `documents` container type only for bundle ids returned by `ifuse -u <udid> --list-apps`
        - e.g. Below _On My iPhone_ image has _Slack_ folder, but `com.tinyspeck.chatlyio` does not exist in the output of `--list-apps`. Thus, we cannot mount it as `com.tinyspeck.chatlyio@documents/`

            <img src='./ios-xctest-file-movement/on_my_iphone.png' width=100>
    - The others work as _format 2_
        - Only apps having the flag `UIFileSharingEnabled` in their `info.plist` can be mounted
- `path_to_the_file_or_folder_inside_container` is the target to push/pull to/from them.
    - If the `optional_container_type` is `documents`, this path will be mapped to
      `On My iPhone/<app name>` in Files app

_format 3_ is not allowed for real devices.

#### Example

If you would like to pull _Presentation.key_ form Keynote app, you can get it as below.

- Pull file

```javascript
// webdriver.io
let data = driver.pullFile('@io.appium.example:documents/Presentation.key');
await fs.writeFile('presentation.key', Buffer.from(data, 'base64'), 'binary');
```

```ruby
# ruby_lib_core
file = @driver.pull_file '@com.apple.Keynote:documents/Presentation.key'
File.open('presentation.key', 'wb') { |f| f<< file }
```

The file is in _On My iPhone/Keynote_ of _Files_ app.

|Top | On  My iPhone | Keynote |
|:----:|:----:|:----:|
|![](./ios-xctest-file-movement/top_files.png)|![](./ios-xctest-file-movement/on_my_iphone.png)|![](./ios-xctest-file-movement/keynote.png)|

If the file is in deeper place like _On My iPhone/Keynote/Dir1/Dir2_, then the Ruby command should be:

```javascript
// webdriver.io
let data = driver.pullFile('@io.appium.example:documents/Dir1/Dir2/Presentation.key');
await fs.writeFile('presentation.key', Buffer.from(data, 'base64'), 'binary');
```

```ruby
# ruby_lib_core
file = @driver.pull_file '@com.apple.Keynote:documents/Dir1/Dir2/Presentation.key'
File.open('presentation.key', 'wb') { |f| f<< file }
```

- Pull folder

You can pull documents root of _On My iPhone/Keynote_ as `@driver.pull_folder '@com.apple.Keynote:documents/'`.

```javascript
// webdriver.io
let data = driver.pullFolder('@io.appium.example:documents/');
await fs.writeFile('documents.zip', Buffer.from(data, 'base64'), 'binary');
```

```ruby
# ruby_lib_core
file = @driver.pull_folder '@com.apple.Keynote:documents/'
File.open('documents.zip', 'wb') { |f| f<< file }
```

- Push file

Same as pull:

```javascript
// webdriver.io
driver.pushFile('@com.apple.Keynote:documents/text.txt', new Buffer("Hello World").toString('base64'));
```

```ruby
# ruby_lib_core
@driver.push_file '@com.apple.Keynote:documents/text.txt', (File.read 'path/to/file')
```

### Simulator

#### Format

The format of method argument should be the following:

- `@<app_bundle_id>` is the application bundle identifier
- `optional_container_type` is the container type
    - `app`, `data`, `groups` or `<A specific App Group container>`
    - _format 2_ case is handled as `app` container
- `path_to_the_file_or_folder_inside_container` is the target to push/pull to/from them

_format 3_ format handles as `app` container

#### Example

```java
// Java
// Get AddressBook.sqlitedb in test app package ('app' container)
byte[] fileContent = driver.pullFile("Library/AddressBook/AddressBook.sqlitedb");
Path dstPath = Paths.get(new File("/local/path/AddressBook.sqlitedb"));
Files.write(dstPath, fileContent);
```

### references
- https://stackoverflow.com/questions/1108076/where-does-the-iphone-simulator-store-its-data
- https://stackoverflow.com/questions/48884248/how-can-i-add-files-to-the-ios-simulator
- https://apple.stackexchange.com/questions/299413/how-to-allow-the-files-app-to-save-to-on-my-iphone-or-to-on-my-ipad-in-ios/299565#299565
