## 调整网络设置

Selenium 的 [Mobile JSON Wire Protocol Specification](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md) 支持一个获取和设置设备网络连接的 [API](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#104) 。这个 API 通过位掩码（bitmask）工作，把所有可能的状态用一个整型数据表示：

| 值 (别名)           | 数据连接 | Wifi 连接 | 飞行模式 |
| ------------------ | ---- | ---- | ------------- |
| 0 (什么都没有)       | 0    | 0    | 0 |
| 1 (飞行模式)         | 0    | 0    | 1 |
| 2 (只有Wifi)        | 0    | 1    | 0 |
| 4 (只有数据连接)     | 1    | 0    | 0 |
| 6 (开启所有网络)     | 1    | 1    | 0 |

翻译备注：数据链接即2g, 3g, 4g的网络连接。

### iOS

很不幸，目前 Appium 在 iOS 下不支持 Selenium 的网络连接 API。

### Android

选择你想使用的设置，然后根据上面的表格发送正确的位掩码(bitmask)。

```javascript
// javascript
// 设置网络连接为飞行模式
driver.setNetworkConnection(1)

// 设置网络连接为仅启用Wifi
driver.setNetworkConnection(2)

// 设置网络连接为仅启用数据连接
driver.setNetworkConnection(4)

// 设置网络连接为启用数据连接和Wifi
driver.setNetworkConnection(6)
```

获取网络连接设置会返回基于同样规则的位掩码，你可以将其解码来获得网络设置。

```javascript
// javascript
driver.getNetworkConnection().then(function (connectionType) {
  switch (connectionType) {
    case 0:
      // 无网络
      break;
    case 1:
      // 飞行模式
      break;
    case 2:
      // wifi
      break;
    case 4:
      // 数据连接
      break;
    case 6:
      // wifi和数据连接
      break;
  }
});
```
