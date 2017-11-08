## Running Appium with multiple Xcode versions installed

If you have multiple Xcode installations you may choose which toolset Appium
should use with one of two ways:

### xcode-select tool
Only available with sudo privileges, affects the whole system.

Assuming you want to choose `/Applications/Xcode7.app`:
1. Set default Xcode.
  ```
  sudo xcode-select -s /Applications/Xcode7.app/Contents/Developer
  ```
2. Run Appium (from command line or with GUI).
  ```
  appium
  ```

### Environment variable
No privileges needed, affects only the current shell, so Appium should be started
within that shell.

Assuming you want to choose `/Applications/Xcode9.app`:
1. Set `DEVELOPER_DIR` environment variable.
  ```
  export DEVELOPER_DIR=/Applications/Xcode9.app/Contents/Developer
  ```
2. Run Appium *from the same shell.*
  ```
  appium
  ```
