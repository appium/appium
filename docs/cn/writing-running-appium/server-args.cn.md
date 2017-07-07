# Appium 服务器参数

使用方法:  `node . [标志]`

## 服务器标志
所有的标志都是可选的，但是有一些标志需要组合在一起才能生效。



<expand_table>

|标志|默认值|描述|例子|
|----|-------|-----------|-------|
|`--shell`|null|进入 REPL 模式||
|`--localizable-strings-dir`|en.lproj|IOS only: 定位 .strings所在目录的相对路径 |`--localizable-strings-dir en.lproj`|
|`--app`|null|iOS: 基于模拟器编译的 app 的绝对路径或者设备目标的 bundle_id； Android: apk 文件的绝对路径`--app /abs/path/to/my.app`|
|`--ipa`|null|(IOS-only)  .ipa 文件的绝对路径|`--ipa /abs/path/to/my.ipa`|
|`-U`, `--udid`|null|连接物理设备的唯一设备标识符|`--udid 1adsf-sdfas-asdf-123sdf`|
|`-a`, `--address`|0.0.0.0|监听的 ip 地址|`--address 0.0.0.0`|
|`-p`, `--port`|4723|监听的端口|`--port 4723`|
|`-ca`, `--callback-address`|null|回调IP地址 (默认: 相同的IP地址)|`--callback-address 127.0.0.1`|
|`-cp`, `--callback-port`|null|回调端口号 (默认: 相同的端口号)|`--callback-port 4723`|
|`-bp`, `--bootstrap-port`|4724|(Android-only) 连接设备的端口号|`--bootstrap-port 4724`|
|`-k`, `--keep-artifacts`|false|弃用，无效。trace信息现在保留tmp目录下，每次运行前会清除该目录中的信息。 也可以参考 --trace-dir 。||
|`-r`, `--backend-retries`|3|(iOS-only) 遇到 crash 或者 超时，Instrument 重新启动的次数。|`--backend-retries 3`|
|`--session-override`|false|允许 session 被覆盖 (冲突的话)||
|`--full-reset`|false|(iOS) 删除整个模拟器目录。 (Android) 通过卸载应用（而不是清除数据）重置应用状态。在 Android 上，session 完成后也会删除应用。||
|`--no-reset`|false|session 之间不重置应用状态 (iOS: 不删除应用的 plist 文件； Android: 在创建一个新的 session 前不删除应用。)||
|`-l`, `--pre-launch`|false|在第一个 session 前，预启动应用 (iOS 需要 --app 参数，Android 需要 --app-pkg 和 --app-activity)||
|`-lt`, `--launch-timeout`|90000|(iOS-only) 等待 Instruments 启动的时间||
|`-g`, `--log`|null|将日志输出到指定文件|`--log /path/to/appium.log`|
|`--log-level`|debug|日志级别; 默认 (console[:file]): debug[:debug]|`--log-level debug`|
|`--log-timestamp`|false|在终端输出里显示时间戳||
|`--local-timezone`|false|使用本地时间戳||
|`--log-no-colors`|false|不在终端输出中显示颜色||
|`-G`, `--webhook`|null|同时发送日志到 HTTP 监听器|`--webhook localhost:9876`|
|`--native-instruments-lib`|false|(IOS-only) iOS 内建了一个怪异的不可能避免的延迟。我们在 Appium 里修复了它。如果你想用原来的，你可以使用这个参数。||
|`--app-pkg`|null|(Android-only) 你要运行的apk的java包。 (例如， com.example.android.myApp)|`--app-pkg com.example.android.myApp`|
|`--app-activity`|null|(Android-only) 打开应用时，启动的 Activity 的名字(比如， MainActivity)|`--app-activity MainActivity`|
|`--app-wait-package`|false|(Android-only) 你想等待的 Activity 的包名。(比如， com.example.android.myApp)|`--app-wait-package com.example.android.myApp`|
|`--app-wait-activity`|false|(Android-only) 你想等待的 Activity 名字(比如， SplashActivity)|`--app-wait-activity SplashActivity`|
|`--android-coverage`|false|(Android-only) 完全符合条件的 instrumentation 类。 作为命令 adb shell am instrument -e coverage true -w 的 -w 的参数 |`--android-coverage com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation`|
|`--avd`|null|(Android-only) 要启动的 avd 的名字||`--avd @default`|
|`--avd-args`|null|(Android-only) 添加额外的参数给要启动avd|`--avd-args -no-snapshot-load`|
|`--device-ready-timeout`|5|(Android-only) 等待设备准备好的时间，以秒为单位|`--device-ready-timeout 5`|
|`--safari`|false|(IOS-Only) 使用 Safari 应用||
|`--device-name`|null|待使用的移动设备名字|`--device-name iPhone Retina (4-inch), Android Emulator`|
|`--platform-name`|null|移动平台的名称: iOS, Android, or FirefoxOS|`--platform-name iOS`|
|`--platform-version`|null|移动平台的版本|`--platform-version 7.1`|
|`--automation-name`|null|自动化工具的名称: Appium or Selendroid|`--automation-name Appium`|
|`--browser-name`|null|移动浏览器的名称: Safari or Chrome|`--browser-name Safari`|
|`--default-device`, `-dd`|false|(IOS-Simulator-only) 使用instruments自己启动的默认模拟器||
|`--force-iphone`|false|(IOS-only) 无论应用要用什么模拟器，强制使用 iPhone 模拟器||
|`--force-ipad`|false|(IOS-only)  无论应用要用什么模拟器，强制使用 iPad 模拟器||
|`--language`|null|iOS / Android 模拟器的语言|`--language en`|
|`--locale`|null|Locale for the iOS simulator / Android Emulator|`--locale en_US`|
|`--calendar-format`|null|(IOS-only) iOS 模拟器的日历格式|`--calendar-format gregorian`|
|`--orientation`|null|(IOS-only) 初始化请求时，使用 LANDSCAPE (横屏) 或者 PORTRAIT (竖屏)|`--orientation LANDSCAPE`|
|`--tracetemplate`|null|(IOS-only) 指定 Instruments 使用的 tracetemplate 文件|`--tracetemplate /Users/me/Automation.tracetemplate`|
|`--show-sim-log`|false|(IOS-only) 如果设置了， iOS 模拟器的日志会写到终端上来||
|`--show-ios-log`|false|(IOS-only) 如果设置了， iOS 系统的日志会写到终端上来||
|`--nodeconfig`|null|指定 JSON 格式的配置文件 ，用来在 selenium grid 里注册 appiumd|`--nodeconfig /abs/path/to/nodeconfig.json`|
|`-ra`, `--robot-address`|0.0.0.0|robot 的 ip 地址|`--robot-address 0.0.0.0`|
|`-rp`, `--robot-port`|-1|robot 的端口地址|`--robot-port 4242`|
|`--selendroid-port`|8080|用来和 Selendroid 交互的本地端口|`--selendroid-port 8080`|
|`--chromedriver-port`|9515|ChromeDriver运行的端口|`--chromedriver-port 9515`|
|`--chromedriver-executable`|null|ChromeDriver 可执行文件的完整路径||
|`--use-keystore`|false|(Android-only) 设置签名 apk 的 keystore||
|`--keystore-path`|(Android-only) keystore 的路径||
|`--keystore-password`|android|(Android-only) keystore 的密码||
|`--key-alias`|androiddebugkey|(Android-only) Key 的别名||
|`--key-password`|android|(Android-only) Key 的密码||
|`--show-config`|false|打印 Appium 服务器的配置信息，然后退出||
|`--no-perms-check`|false|跳过Appium对是否可以读/写必要文件的检查||
|`--command-timeout`|60|默认所有会话的接收命令超时时间 (在超时时间内没有接收到新命令，自动关闭会话)。 会被新的超时时间覆盖||
|`--keep-keychains`|false|(iOS) 当 Appium 启动或者关闭的时候，是否保留 keychains (Library/Keychains)||
|`--strict-caps`|false|如果所选设备是appium不承认的有效设备，会导致会话失败||
|`--isolate-sim-device`|false|Xcode 6存在一个bug，那就是一些平台上如果其他模拟器设备先被删除时某个特定的模拟器只能在没有任何错误的情况下被建立。这个选项导致了Appium不得不删除除了正在使用设备以外其他所有的设备。请注意这是永久性删除，你可以使用simctl或xcode管理被Appium使用的设备类别。||
|`--tmp`|null|可以被Appium用来管理临时文件的目录（绝对路径），比如存放需要移动的内置iOS应用程序。 默认的变量为 `APPIUM_TMP_DIR` ，在 *nix/Mac 为 `/tmp` 在windows上使用环境便令 `TEMP` 设定的目录。||
|`--trace-dir`|null|用于保存iOS instruments trace的 appium 目录，是绝对路径， 默认为 <tmp dir>/appium-instruments||
|`--intent-action`|android.intent.action.MAIN|(Android-only) 用于启动 activity 的intent action|`--intent-action android.intent.action.MAIN`|
|`--intent-category`|android.intent.category.LAUNCHER|(Android-only) 用于启动 activity 的intent category|`--intent-category android.intent.category.APP_CONTACTS`|
|`--intent-flags`|0x10200000|(Android-only) 启动 activity 的标志|`--intent-flags 0x10200000`|
|`--intent-args`|null|(Android-only) 启动 activity 时附带额外的 intent 参数|`--intent-args 0x10200000`|
|`--suppress-adb-kill-server`|false|(Android-only) 如果被设定，阻止Appium杀掉adb实例。||
