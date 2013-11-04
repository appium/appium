Appium 服务关键字
==========

|关键字|描述|实例|
|----|-----------|-------|
|`app`|`.ipa` or `.apk`文件所在的本地绝对路径或者远程路径,也可以是一个包括两者的`.zip`. Appium会先尝试安装路径对应的应用在适当的真机或模拟器上.也可以是一个`chrome`或者`chromium`，这样就会在android系统中其中chrome或chromium,也可以是`safari`会启动ios上的safari. 针对Android系统，如果你指定`app-package`和`app-activity`(具体见下面)的话，那么就可以不指定`app`.|比如`/abs/path/to/my.apk`或`http://myapp.com/app.ipa`, Android上的`chrome`, `chromium`, iOS的`safari`|
|`browserName`|要启动的浏览器的名称|比如`chrome`和`safari`|
|`device`|要使用的模拟器或真机的类型名称|比如`ios`, `selendroid`, `firefoxos`, `mock_ios`, `android` |
|`version`|Android API版本, iOS版本, Chrome/Safari版本|比如6.1|

--

#### Android特有的

|关键字|描述|实例|
|----|-----------|-------|
|`app-activity`| 你要启动的Android 应用对应的Activity名称|比如`MainActivity`, `.Settings`|
|`app-package`| 你想运行的Android应用的包名|比如`com.example.android.myApp`, `com.android.settings`|
|`app-wait-activity`| 你想要等待启动的Android Activity名称|比如`SplashActivity`|
|`device-ready-timeout`| 设置一个模拟器或真机准备就绪的时间|比如`5`|
|``compressXml``| 参考[setCompressedLayoutHeirarchy(true)](http://developer.android.com/tools/help/uiautomator/UiDevice.html#setCompressedLayoutHeirarchy(boolean\))| `true`|
