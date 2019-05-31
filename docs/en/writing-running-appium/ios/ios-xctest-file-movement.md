## Pushing/Pulling files

Appium provides [Pull Folder](http://appium.io/docs/en/commands/device/files/pull-folder/), [Pull File](http://appium.io/docs/en/commands/device/files/pull-file/) and [Push File](http://appium.io/docs/en/commands/device/files/push-file/) to move files.
This documentation aims to help to understand how they work for iOS since iOS is a bit complicated.

### Real device

For real devices, Appium relies on [ifuse](https://github.com/libimobiledevice/ifuse) to achieve the feature.
You should install them from source code or via brew tasks like below.

```
$ brew cask install osxfuse
$ brew install ifuse --HEAD # newer iOS versions need the latest codebase
```

#### Format

The format should be like below.

- `@io.appium.example` is a bundle id.
- `Documents/appium.png` is the target to push/pull to/from them.
    - If `Documents` exists, Appium tries to mount with `--documents` flag in ifuse
        - If your target app exists in the result of `ifuse -u <udid> --list-apps`, it can be mounted by this way
        - e.g. Below _On My iPhone_ image has _Slack_ folder, but `com.tinyspeck.chatlyio` does not in the result of `--list-apps`. Thus, we cannot mount it as `com.tinyspeck.chatlyio:Documents/appium.png`
    - Appium tries to mount with `--container` flag in ifuse except for the `Documents` case
        - In this case, the target app must have `UIFileSharingEnabled` flag in its `info.plist`

```javascript
// webdriver.io
let data = driver.pullFolder('@io.appium.example:Documents/appium.png');
```

#### Example

If you would like to pull _Presentation.key_ form Keynote app, you can get it as below.

```ruby
# ruby_lib_core
file = @driver.pull_file '@com.apple.Keynote/Documents/Presentation.key'
File.open('presentation.key', 'wb') { |f| f<< file }
```

The file is in _On My iPhone/Keynote_ on Files app.

|Top | On  My iPhone | Keynote |
|:----:|:----:|:----:|
|![](./ios-xctest-file-movement/top_files.png)|![](./ios-xctest-file-movement/on_my_iphone.png)|![](./ios-xctest-file-movement/keynote.png)|

If the file is in deeper place like _On My iPhone/Keynote/Dir1/Dir2_, then the Ruby command should be:

```ruby
# ruby_lib_core
file = @driver.pull_file '@com.apple.Keynote/Documents/Dir1/Dir2/Presentation.key'
File.open('presentation.key', 'wb') { |f| f<< file }
```

### Simulator

Simulators case is easier than the real device.
Files are in the `.app` container. If you would like to get `/some/file` in the app, you can get them as the below.

```java
// Java
byte[] fileBase64 = driver.pullFile("Appium.app/some/file");
```
