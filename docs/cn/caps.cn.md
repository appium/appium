# Appium 服务关键字

<expand_table>

|关键字|描述|实例|
|----|-----------|-------|
|`app`|`.ipa` or `.apk`文件所在的本地绝对路径或者远程路径,也可以是一个包括两者的`.zip`. Appium会先尝试安装路径对应的应用在适当的真机或模拟器上.也可以是一个`chrome`或者`chromium`，这样就会在android系统中其中chrome或chromium,也可以是`safari`会启动ios上的safari. 针对Android系统，如果你指定`app-package`和`app-activity`(具体见下面)的话，那么就可以不指定`app`.|比如`/abs/path/to/my.apk`或`http://myapp.com/app.ipa`, Android上的`chrome`, `chromium`, iOS的`safari`|
|`browserName`|考虑到Selenium的兼容性，必须要使用`''`;要启动的浏览器的名称|比如`chrome`和`safari`|
|`device`|要使用的模拟器或真机的类型名称|比如`ios`, `selendroid`, `firefoxos`, `mock_ios`, `android` |
|`version`|Android API版本, iOS版本, Chrome/Safari版本|(Android)4.2/4.3(ios) 6.0/6.1/7.0|
|`newCommandTimeout`|设置在接受到有效命令之前结束进程并退出的时间|比如. `60`|
|`launch`|在Appium已经安装的情况下可自动启动app。默认是`true`|`true`, `false`|

### Android特有

<expand_table>

|关键字|描述|实例|
|----|-----------|-------|
|`app-activity`| 你要启动的Android 应用对应的Activity名称|比如`MainActivity`, `.Settings`|
|`app-package`| 你想运行的Android应用的包名|比如`com.example.android.myApp`, `com.android.settings`|
|`app-wait-activity`| 你想要等待启动的Android Activity名称|比如`SplashActivity`|
|`device-ready-timeout`| 设置一个模拟器或真机准备就绪的时间|比如`5`|

### iOS特有

<expand_table>

|关键字|描述|实例|
|----|-----------|-------|
|`calendarFormat`| 为iOS的模拟器设置日历格式|比如. `gregorian`公历|
|`deviceName`| iOS Simulator 的设备名|比如. `iPhone Retina (3.5-inch)`|
|`language`| 为iOS的模拟器设置系统语言|比如. `fr`法语|
|`launchTimeout`| 在Appium运行失败之前设置一个等待instruments的时间|比如. `20000`毫秒|
|`locale`| 为iOS模拟器进行区域设置|比如. `fr_CA`法语|