## Adjusting Network Connection

The Selenium [Mobile JSON Wire Protocol Specification](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md) supports an [API](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#104) for getting and setting the network connection for a device. The API works through a bitmask, assigning an integer to each possible state:

| Value (Alias)      | Data | Wifi | Airplane Mode |
| ------------------ | ---- | ---- | ------------- |
| 0 (None)           | 0    | 0    | 0 |
| 1 (Airplane Mode)  | 0    | 0    | 1 |
| 2 (Wifi only)      | 0    | 1    | 0 |
| 4 (Data only)      | 1    | 0    | 0 |
| 6 (All network on) | 1    | 1    | 0 |

### iOS

Unfortunately, at the moment Appium does not support the Selenium network
connection API for iOS.

### Android

There are the following limitations:

#### Real Devices

* Changing Airplane Mode state only works for Android 6 and older
* Chaning data connection state works for Android 4.4 and older. Newer OS releases (5.0+) must be rooted in order to make the feature working (e. g. _su_ binary should available)
* Changing Wi-Fi connection state should work for all Android versions

#### Emulators

* Changing Airplane Mode state only works for Android 6 and older
* Chaning data connection state should work for all Android versions
* Changing Wi-Fi connection state should work for all Android versions

### Windows

Unfortunately, at the moment Appium does not support the Selenium network
connection API for Windows.

```javascript
// javascript
// set airplane mode
driver.setNetworkConnection(1)

// set wifi only
driver.setNetworkConnection(2)

// set data only
driver.setNetworkConnection(4)

// set wifi and data
driver.setNetworkConnection(6)
```

Retrieving the network connection settings returns the same bitmask, from which
the status can be decoded.

```javascript
// javascript
driver.getNetworkConnection().then(function (connectionType) {
  switch (connectionType) {
    case 0:
      // no network connection
      break;
    case 1:
      // airplane mode
      break;
    case 2:
      // wifi
      break;
    case 4:
      // data
      break;
    case 6:
      // wifi and data
      break;
  }
});
```
