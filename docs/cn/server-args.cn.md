# Appium 服务器参数

使用方法: `node . [标志]`

###
所有的标志都是可选的，但是有一些标志需要组合在一起才能生效。

<expand_table>

|标志|默认值|描述|例子|
|----|-------|-----------|-------|
|`--shell`|null|进入 REPL 模式||
|`--app`|null|iOS: 基于模拟器编译的 app 的绝对路径或者设备目标的 bundle_id； Android: apk 文件的绝对路径|`--app /abs/path/to/my.app`|
|`--ipa`|null|(IOS-only)  .ipa 文件的绝对路径|`--ipa /abs/path/to/my.ipa`|
|`-q`, `--quiet`|false|不输出具体日志||
|`-U`, `--udid`|null|连接的物理实体机的 udid|`--udid 1adsf-sdfas-asdf-123sdf`|
|`-a`, `--address`|0.0.0.0|监听的 ip 地址|`--address 0.0.0.0`|
|`-p`, `--port`|4723|监听的端口|`--port 4723`|
|`-dp`, `--device-port`|4724|(Android-only) 连接设备的端口号|`--device-port 4724`|
|`-k`, `--keep-artifacts`|false|(IOS-only) 保留 Instruments trace 目录||
|`-r`, `--backend-retries`|3|(iOS-only) 遇到 crash 或者 超时，Instrument 重新参试启动的次数。|`--backend-retries 3`|
|`--session-override`|false|允许 session 覆盖 (冲突的话)||
|`--full-reset`|false|(iOS) 删除整个模拟器目录。 (Android) 通过卸载应用（而不是清楚数据）重置应用状态。在 Android 上，session 完成后也会删除应用。||
|`--no-reset`|false|session 之间不充值应用状态 (IOS: 不删除应用的 plist 文件； Android: 在创建一个新的 session 前不删除应用。)||
|`-l`, `--pre-launch`|false|在第一个 session 前，预启动应用 (iOS 需要 --app 参数，Android 需要 --app-pkg 和 --app-activity)||
|`-lt`, `--launch-timeout`|90000|(iOS-only) 等待 Instruments 启动的时间||
|`-g`, `--log`|null|将日志输出到指定文件|`--log /path/to/appium.log`|
|`--log-timestamp`|false|在终端输出里显示时间戳||
|`--log-no-colors`|false|不在终端输出中显示颜色||
|`-G`, `--webhook`|null|同时发送日志到 HTTP 监听器|`--webhook localhost:9876`|
|`--native-instruments-lib`|false|(IOS-only) iOS 内建了一个怪异的不可能避免的延迟。我们在 Appium 里修复了它。如果你想用原来的，你可以使用这个参数。||
|`--merciful`, `-m`|false|不运行强制关闭没有响应的 instruments 的监视进程||
|`--app-pkg`|null|(Android-only) 你要运行的apk的java 包。 (例如， com.example.android.myApp)|`--app-pkg com.example.android.myApp`|
|`--app-activity`|null|(Android-only) 打开应用时，启动的 Activity 的名字(比如， MainActivity)|`--app-activity MainActivity`|
|`--app-wait-package`|false|(Android-only) 你想等待的 Activity 的 包名。(比如， com.example.android.myApp)|`--app-wait-package com.example.android.myApp`|
|`--app-wait-activity`|false|(Android-only) 你想等待的 Activity 名字(比如， SplashActivity)|`--app-wait-activity SplashActivity`|
|`--android-coverage`|false|(Android-only) 完全符合条件的 instrumentation 类. 作为命令 adb shell am instrument -e coverage true -w 的 -w 的参数|`--android-coverage com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation`|
|`--avd`|null|要启动的 avd 的名字|`--avd @default`|
|`--device-ready-timeout`|5|(Android-only) 等待设备准备好的时间，以秒为单位|`--device-ready-timeout 5`|
|`--safari`|false|(IOS-Only) 使用 Safari 应用||
|`--device-name`|null|(IOS-Simulator-only) 待使用的 iOS 设备名字|`--device-name iPhone Retina (4-inch)`|
|`--default-device`, `-dd`|false|(IOS-Simulator-only) instruments 启动时使用默认的模拟器||
|`--force-iphone`|false|(IOS-only) 无论应用要用什么模拟器，强制使用 iPhone 模拟器||
|`--force-ipad`|false|(IOS-only) 无论应用要用什么模拟器，强制使用 iPad 模拟器||
|`--language`|null|(IOS-only) iOS 模拟器的语言|`--language en`|
|`--locale`|null|(IOS-only) iOS simulator 的区域|`--locale en_US`|
|`--calendar-format`|null|(IOS-only) iOS 模拟器的日历格式|`--calendar-format gregorian`|
|`--orientation`|null|(IOS-only) 初始化请求时，使用 LANDSCAPE 或者 PORTRAIT|`--orientation LANDSCAPE`|
|`--tracetemplate`|null|(IOS-only) 指定 Instruments 使用的 .tracetemplate 文件|`--tracetemplate /Users/me/Automation.tracetemplate`|
|`--show-sim-log`|false|(IOS-only) 如果设置了， iOS 模拟器的日志会写到终端上来||
|`--nodeconfig`|null|指定 JSON 格式的配置文件 ，用来在 selenium grid 里注册 appium|`--nodeconfig /abs/path/to/nodeconfig.json`|
|`-ra`, `--robot-address`|0.0.0.0|robot 的 ip 地址|`--robot-address 0.0.0.0`|
|`-rp`, `--robot-port`|-1|robot 的端口地址|`--robot-port 4242`|
|`--selendroid-port`|8080|用来和 Selendroid 交互的本地端口|`--selendroid-port 8080`|
|`--chromedriver-port`|9515|ChromeDriver运行的端口|`--chromedriver-port 9515`|
|`--use-keystore`|false|(Android-only) 设置签名 apk 的 keystore||
|`--keystore-path`|/Users/user/.android/debug.keystore|(Android-only) keystore 的路径||
|`--keystore-password`|android|(Android-only) keystore 的密码||
|`--key-alias`|androiddebugkey|(Android-only) Key 的别名||
|`--key-password`|android|(Android-only) Key 的密码||
|`--show-config`|false|打印 Appium 服务器的配置信息，然后退出||
|`--keep-keychains`|false|(iOS) 当 Appium 启动或者关闭的时候，是否保有 keychains (Library/Keychains)||
