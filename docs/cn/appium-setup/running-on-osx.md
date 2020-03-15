## 在 Mac OS Xcode 上运行 Appium

在 OS X 上，Appium 支持 iOS 与 Android 测试。

### 系统配置（iOS）

* Appium 要求 Mac OS X 10.10 或更高的系统版本。
* 确保你已经安装 Xcode 与 iOS 的 SDK。推荐使用 Xcode 7.1版本，因为早期版本的 Xcode 的版本对于可测试的 iOS 版本是受限的。查看下面的章节了解更多信息。
* 你需要给 iOS 模拟器授权使用。请查看[下面章节](#authorizing-ios-on-the-computer)。
* 如果你使用 Xcode 7.x 及以上版本，Instruments Without Delay(IWD) 已经失效了。你通过[这个方法](/docs/cn/advanced-concepts/iwd_xcode7.md)去使用 IWD (它会使你的测试速度显著提升)。
* 如果你使用 Xcode 6，使用 Appium 前你得提前启动模拟器。假如你想发送文本信息，你得改变他的默认设置，去开启虚拟键盘。开启键盘后，你就可以通过点击输入框，或使用快捷键（comand + K）去调出键盘。
* 如果你使用 Xcode 6，Xcode 上有个模块叫 Devices（快捷键：comand-shift-2）。使用 Appium 的时候，你只需要在 capabilities 中的 devicesName 参数填上你的设备名字，每一个 sdk 版本都会对应一个设备。换句话说，如果你在 capabilities 里设置了 devicesName 为 "iPhone 5s" 以及 platformVersion 为 "8.0"，你就得保证在设备列表里，这是唯一一个使用 8.0 sdk 且名为"iPhone 5s"的设备。否则，Appium 就不会知道你想用的哪台设备。
* 在 iOS 8，可以在`设置`里开启或者关闭 UIAutomation。该设置就在手机的设置里一个叫"Developer"页面。在使用模拟器或者真机去做自动化前，你需要去该页面确保 UIautomation 开关已经开启。

### 授权 iOS 设备给你的电脑

然后运行以下命令去调起该工具

```
sudo authorize-ios
```

如果你是使用 [Appium.app](https://github.com/appium/appium-dot-app)，你可以在 GUI 界面进行授权。

每次更新 Xcode 版本的时候，你都需要重复以上步骤哦！

### 使用多种 iOS SDK 测试

Xcode 7.1 版本允许使用 iOS 7.1 以及更高级的系统版本去做自动化测试。

如果你使用多个 Xcode 版本，你使用以下命令去切换版本：

    sudo xcode-select --switch &lt;path to required xcode&gt;

### 在 Xcode 8（包括 iOS 10）下使用 XCUITest 进行测试

为了在 Xcode 8（其中包括所有 iOS 10+ 的测试）使用 iOS 真机做自动化，你要安装 [Carthage](https://github.com/Carthage/Carthage) 去做依赖管理：
```
brew install carthage
```

### 测试 Mac 应用

目前为止，Mac 对应的 appium driver 在 AppiumForMac 的二进制文件还没发布，也就是说如果你想进行 Mac 应用的自动化，你就得手动去安装 AppiumForMac 应用，并且对 OS X 授予可访问权限。


如何安装 Appium for Mac：
1. [下载该发布版本](https://github.com/appium/appium-for-mac/releases/tag/0.2.0)，将他解压缩到 `/Applications` 文件夹中
2. 查看 [简要补充安装说明](https://github.com/appium/appium-for-mac#installation)，确保 appium 放访问到 OS X 的 Accessibility APIs

更多相关如何使用 Appium for mac 的相关信息，请查阅该[文档](https://github.com/appium/appium-for-mac#appium-for-mac)。


### 系统配置（Android）

Android 的设置操作指南与在 Mac OS X 上的设置，大致与 Linux 上的设置相似，可以参考 [Android 设置文档](/docs/en/drivers/android-uiautomator2.md#basic-setup)。

### 使用 Jenkins 在 OS X 上运行 iOS 测试

第一步就是下载 jenkins-cli.jar，以及验证你的 Mac 是否成功的连接上 Jenkins 主机。确保已经运行了 `authorize-ios` 等相关的命令。

`wget https://jenkins.ci.cloudbees.com/jnlpJars/jenkins-cli.jar`

```
java -jar jenkins-cli.jar \
 -s https://team-appium.ci.cloudbees.com \
 -i ~/.ssh/id_rsa \
 on-premise-executor \
 -fsroot ~/jenkins \
 -labels osx \
 -name mac_appium
 ```

接下来为了在登录的时候可以自动启动，定义一个 Jenkins 的 LaunchAgent。LaunchDaemon 将会停止工作，因为 deamons 没有获取 GUI 的访问权限。确保 plist 文件不会包含`SessionCreate` 或 `User` 这两个键值，就防止测试在运行时启动。如果漏了配置，你会看到该报错： `Failed to authorize rights`。


```
$ sudo nano /Library/LaunchAgents/com.jenkins.ci.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jenkins.ci</string>
    <key>ProgramArguments</key>
    <array>
        <string>java</string>
        <string>-Djava.awt.headless=true</string>
        <string>-jar</string>
        <string>/Users/appium/jenkins/jenkins-cli.jar</string>
        <string>-s</string>
        <string>https://instructure.ci.cloudbees.com</string>
        <string>on-premise-executor</string>
        <string>-fsroot</string>
        <string>/Users/appium/jenkins</string>
        <string>-executors</string>
        <string>1</string>
        <string>-labels</string>
        <string>mac</string>
        <string>-name</string>
        <string>mac_appium</string>
        <string>-persistent</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/appium/jenkins/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/appium/jenkins/error.log</string>
</dict>
</plist>
```

最后设置 owner，权限，再开启代理。

```
sudo chown root:wheel /Library/LaunchAgents/com.jenkins.ci.plist
sudo chmod 644 /Library/LaunchAgents/com.jenkins.ci.plist

launchctl load /Library/LaunchAgents/com.jenkins.ci.plist
launchctl start com.jenkins.ci
```

### 运行 iOS 测试时生成的文件

测试 iOS 的过程中生成的文件有时可能会过大。这些文件包含日志，临时文件，还有 Xcode 运行时产生的数据。一般来说，下面的这些地址都是这些文件保存的地方，可以删除他们节省空间：

```
$HOME/Library/Logs/CoreSimulator/*
```

基于 Instruments 的测试 (iOS 不是使用 `XCUITest` 作为 `automationName`):

```
/Library/Caches/com.apple.dt.instruments/*
```

基于 XCUITest 的测试：

```
$HOME/Library/Developer/Xcode/DerivedData/*
```

本文由 [thanksdanny](https://testerhome.com/thanksdanny) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。
