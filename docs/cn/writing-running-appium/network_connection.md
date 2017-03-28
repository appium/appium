## 调整网络连接

Selenium[移动JSON协议规范]（https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md) 支持 [API](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#104）获取和设置网络连接和一个设备。通过API的整数位掩码，分配给你的可能的状态为

| 值 (名称)          | 数据 | Wifi | 飞行模式 |
| ------------------ | ---- | ---- | ------------- |
| 0 (无网)           | 0    | 0    | 0 |
| 1 (飞行模式)       | 0    | 0    | 1 |
| 2 (Wifi)           | 0    | 1    | 0 |
| 4 (移动数据)       | 1    | 0    | 0 |
| 6 (所有网络)       | 1    | 1    | 0 |

### iOS

不幸的是，目前Appium不支持iOS连接APISelenium网络

### Android

选择您要使用的设置，然后上面的从协议规范表发送正确的位掩码。

### Windows

不幸的是，目前Appium不支持Windows连接APISelenium网络。

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

检索网络连接设置返回相同的掩码，其中状态可以解码。

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
