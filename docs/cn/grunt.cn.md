# Appium grunt 命令

[Grunt](http://gruntjs.com) 是 Node.js 的 Make! 我们用它来自动化所有的 appium 开发任务。 下面就是你能做的：

|任务|描述|
|----|-----------|
|grunt lint|运行 JSLint|
|grunt test|运行所有的测试|
|grunt functional|运行整个功能测试集|
|grunt ios|运行 iOS 功能测试集|
|grunt android|运行 Android 功能测试集|
|grunt selendroid|运行 selendroid 功能测试集|
|grunt firefoxos|运行 firefoxos 功能测试集|
|grunt unit|运行所有的单元测试|
|grunt buildApp:&lt;AppName&gt;:&lt;SDK&gt;|构建一个用于 iPhone 模拟器的 iOS 应用。  我们预计这个应用的路径是 `sample-code/apps/<AppName>/build/Release-iphonesimulator/<AppName>.app`. 默认的 SDK 是 'iphonesimulator6.0'|
|grunt signApp:&lt;certName&gt;|使用开发证书的绝对路径，签名测试应用。|
|grunt authorize|授权模拟器，使它不需要弹框请求权限。|
|grunt log|打印 appium.log (运行测试的时候很有用)|
|grunt configAndroidBootstrap|配置使用 ant 构建 Android 的 bootstrap.jar|
|grunt buildAndroidBootstrap|使用 ant 构建 bootstrap.jar|
|grunt buildSelendroidServer|构建 selendroid 服务器|
|grunt configAndroidApp:&lt;AppName&gt;|配置使用 ant 构建 android 测试应用。 我们期待有一个  `sample-code/apps/<AppName>` 的 Android 项目|
|grunt buildAndroidApp:&lt;AppName&gt;|使用 ant 构建项目. 会在 `sample-code/apps/<AppName>` 下生成应用。|
|grunt installAndroidApp:&lt;AppName&gt;|将安卓应用安装到模拟器和设备中去|
|grunt docs|生成文档|
|grunt generateAppiumIo|将 README.md 转成 appium.io 的 getting-started.html|
|grunt setConfigVer:&lt;device&gt;|将 package.json 里面 appium 的版本号和对应设备写入 `.appiumconfig.json` 文件|

## 其他

`grunt buildApp` 默认使用 iPhone 6.1 模拟器的 SDK 来构建应用。你可以传其他的 SDK 给 grunt 命令。
(用 `xcodebuild -showsdks` 找出你所有的 sdk）:

    > grunt buildApp:UICatalog:iphonesimulator6.0
