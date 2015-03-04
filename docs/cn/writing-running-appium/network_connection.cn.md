## 调整网络设置

Selenium 的 [移动设备 JSON 连接协议](https://code.google.com/p/selenium/source/browse/spec-draft.md?repo=mobile) 支持一个获取和设置设备网络连接的 [API](https://code.google.com/p/selenium/source/browse/spec-draft.md?repo=mobile#104) 。这个 API 通过位掩码（bitmask）工作，把一个整形数据分配给所有可能的状态：

| 值 (别名)           | 数据连接 | Wifi 连接 | 飞行模式 |
| ------------------ | ---- | ---- | ------------- |
| 0 (什么都没有)       | 0    | 0    | 0 |
| 1 (飞行模式)         | 0    | 0    | 1 |
| 2 (只有Wifi)        | 0    | 1    | 0 |
| 4 (只有数据连接)     | 1    | 0    | 0 |
| 6 (开启所有网络)     | 1    | 1    | 0 |

### iOS

很不幸，目前 Appium 在 iOS 下不支持 Selenium 的网络连接 API。

### Android

选择你想使用的设置，然后根据上面的表格发送正确的位掩码(bitmask)。

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

获取网络连接设置会返回基于同样规则的位掩码，你可以将其解码来获得网络设置。

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
