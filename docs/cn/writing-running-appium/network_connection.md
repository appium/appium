## 调整网络连接

Selenium [移动 JSON 协议规范]（https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md) 支持一个获取和设置网络连接的[API](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#104）。这个 API 会设置一个掩码，每一个可能的网络状态对应一个掩码

| 值 (名称)          | 数据 | Wifi | 飞行模式 |
| ------------------ | ---- | ---- | ------------- |
| 0 (无网)           | 0    | 0    | 0 |
| 1 (飞行模式)       | 0    | 0    | 1 |
| 2 (Wifi)           | 0    | 1    | 0 |
| 4 (移动数据)       | 1    | 0    | 0 |
| 6 (所有网络)       | 1    | 1    | 0 |

### iOS

不幸的是，目前 Appium 不支持这个 API。

### Android

Android 上有如下限制：

#### 真机

* 只能在 Android 6 或者以下，改变飞行模式
* 只能在 Android 4.4 或者以下改变数据连接状态。5.0 或者以上必须 root 了之后才能工作。(比如，可以运行 _su_ )
* 所有的 Android 版本都能改变 WI-FI 连接状态

#### 模拟器

* 只能在 Android 6 或者以下，改变飞行模式
* 所有的 Android 版本都能改变数据连接
* 所有的 Android 版本都能改变 WI-FI 连接状态

### Windows

不幸的是，目前 Appium 测试 Windows 应用，不支持这个 API。

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

本文由 [testly](https://github.com/testly) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。