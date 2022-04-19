# Appium 服务器参数

许多 Appium 1.5 中的服务器参数已被弃用，取而代之使用的是 [-default-capabilities 标识](/docs/en/writing-running-appium/default-capabilities-arg.md) 。

用法：node . [标志]

## 服务器标志
所有标志都是可选的，但是有些必须跟指定标志组合使用才生效。



<expand_table>

|标志|默认|描述|示例|
|----|----|----|----|
|`--shell`|null| 进入 REPL 模式 ||
|`--allow-cors`|false|打开 CORS 兼容模式，这将允许从托管在任何域中的网站内连接到 Appium 服务器。启用此功能时要小心，因为如果您访问的网站使用跨域请求，在 Appium 服务器上启动或运行内省会话，则可能存在安全风险。||
|`--ipa`|null| （仅 iOS）.ipa 文件的绝对路径 | `--ipa /abs/path/to/my.ipa` |
|`-a`, `--address`|0.0.0.0| 监听的 ip 地址 | `--address 0.0.0.0` |
|`-p`, `--port`|4723| 监听的端口 | `--port 4723` |
|`-ca`, `--callback-address`|null| 回调 ip 地址 (默认：与 --address 相同） | `--callback-address 127.0.0.1` |
|`-cp`, `--callback-port`|null| 回调端口（默认：与 --port 相同） | `--callback-port 4723` |
|`-bp`, `--bootstrap-port`|4724| （仅 Android）设备跟 Appium 通信的端口 | `--bootstrap-port 4724` |
|`-r`, `--backend-retries`|3| （仅 iOS）遇到 crash 或者超时，尝试重启Instruments的次数 | `--backend-retries 3` |
|`--session-override`|false| 允许 session 覆盖（如有冲突）||
|`-l`, `--pre-launch`|false| 首次建立session时预启动应用（iOS 需要 –app 参数，Android 需要 –app-pkg 和 –app-activity 参数）||
|`-g`, `--log`|null| 将日志输出到指定文件 | `--log /path/to/appium.log` |
|`--log-level`|debug| 为控制台和日志文件设置服务器日志等级（值为 `console-level:logfile-level`，如果只提供一个值，则两者相同）。可选的值为 `debug`、`info`、`warn`、`error`，并且越往后，日志越少。| `--log-level error:debug` |
|`--log-timestamp`|false| 在终端输出中显示时间戳 ||
|`--local-timezone`|false| 时间戳使用本地时区 ||
|`--log-no-colors`|false| 终端输出不为彩色 ||
|`-G`, `--webhook`|null| 同时发送日志输出到 HTTP 监听器 | `--webhook localhost:9876` |
|`--safari`|false| （仅iOS）使用 safari 应用程序 ||
|`--default-device`, `-dd`|false| （仅iOS模拟器）使用默认模拟器启动 Instruments ||
|`--force-iphone`|false| (仅 iOS）不管应用程序指定什么设备，都强制使用 iPhone 模拟器||
|`--force-ipad`|false| (仅 iOS）不管应用程序指定什么设备，都强制使用 iPad 模拟器||
|`--tracetemplate`|null|(仅 iOS) 指定 Instruments 所使用的 .tracetemplate 文件 | `--tracetemplate /Users/me/Automation.tracetemplate` |
|`--instruments`|null| （仅 iOS）Instruments 二进制文件的路径 | `--instruments /path/to/instruments` |
|`--nodeconfig`|null| 指定 JSON 格式的配置文件，用于在 selenium grid 中注册 appium | `--nodeconfig /abs/path/to/nodeconfig.json` |
|`-ra`, `--robot-address`|0.0.0.0| robot 的 IP 地址 | `--robot-address 0.0.0.0` |
|`-rp`, `--robot-port`|-1| robot 的端口号 | `--robot-port 4242` |
|`--selendroid-port`|8080| 用于和 Selendroid 通信的本地端口 | `--selendroid-port 8080` |
|`--chromedriver-port`|9515| ChromeDriver 运行使用的端口 | `--chromedriver-port 9515` |
|`--chromedriver-executable`|null| ChromeDriver 可执行文件的完整路径 ||
|`--show-config`|false| 打印 appium 服务器的配置信息，然后退出 ||
|`--no-perms-check`|false| 绕过Appium检查，确保我们可以读 / 写必要的文件||
|`--strict-caps`|false| 如果所选设备不能被 appium 有效识别，则导致会话失败 ||
|`--isolate-sim-device`|false| Xcode 6 在某些平台上存在存在一个 bug，想要正确启动某个模拟器，只能去删除掉所有其他模拟器。这个选项将导致了 Appium 删除除了正在使用的设备以外其他所有设备。请注意，这是永久性删除，你可以使用 simctl 或 xcode 管理被 Appium 使用的设备类别。 ||
|`--tmp`|null| 目录的绝对路径将被 Appium 用于管理临时文件，比如存放需要移动的内置 iOS 应用程序。在 *nix / Mac 上默认为 /tmp，在 Windows 上默认为 C:\Windows\Temp ||
|`--trace-dir`|null| appium 用于保存iOS instruments 轨迹的目录，是绝对路径，默认为 <tmp dir>/appium-instruments ||
|`--debug-log-spacing`|false| 在日志中加大间距，帮助进行视觉检查||
|`--suppress-adb-kill-server`|false| （仅 Android) 如果设置了，可以阻止 Appium 杀掉 adb 实例||
|`--async-trace`|false| 向日志条目添加长堆栈追踪。建议仅在调试时使用 ||
|`-dc`, `--default-capabilities`|{}| 设置默认预期功能（Desired capabilities），每个会话都将使用默认预期功能，除非被新的功能覆盖 | `--default-capabilities [ '{"app": "myapp.app", "deviceName": "iPhone Simulator"}' | /path/to/caps.json ]` |
|`--reboot`|false| - （仅 Android）每次建立会话都重启模拟器，会话结束后杀掉模拟器 ||
|`--command-timeout`|60| 【弃用】- 没有效果。这曾是服务器用于所有会话接收命令的默认超时时间（单位是秒，但不超过 2147483）。预期能力（Desired capabilities）中的 newCommandTimeout 替代 ||
|`-k`, `--keep-artifacts`|false| 【弃用】 - 没有效果。trace 现在默认位于 tmp 目录下，每次运行前都会清除。请查考 --trace-dir 标识 ||
|`--platform-name`|null| 【弃用】 - 移动平台名称：iOS、Android 或 FirefoxOS | `--platform-name iOS`|
|`--platform-version`|null| 【弃用】 - 移动平台的版本号 | `--platform-version 7.1` |
|`--automation-name`|null| 【弃用】 - 自动化工具的名称: Appium 或 Selendroid | `--automation-name Appium` |
|`--device-name`|null| 【弃用】 - 将使用的移动设备的名称 | `--device-name iPhone Retina (4-inch), Android Emulator` |
|`--browser-name`|null| 【弃用】 - 移动浏览器的名称: Safari 或者 Chrome | `--browser-name Safari`                  |
|`--app`|nul| 【弃用】 - IOS：基于模拟器编译的 .app 文件的绝对路径或者设备上目标的 BundleId； Android：.apk 文件的绝对路径 | `--app /abs/path/to/my.app` |
|`-lt`, `--launch-timeout`|90000| 【弃用】 - (仅iOS) Instruments启动等待时间（单位：ms） ||
|`--language`|null| 【弃用】 - iOS 模拟器 / Android 模拟器的语言 | `--language en` |
|`--locale`|null| 【弃用】 - iOS 模拟器 / Android 模拟器的区域 | `--locale en_US` |
|`-U`, `--udid`|null| 【弃用】 - 连接的物理设备的 udid | `--udid 1adsf-sdfas-asdf-123sdf` |
|`--orientation`|null| 【弃用】 - （仅 iOS) 初始化请求时，使用 LANDSCAPE 或者 PORTRAIT | `--orientation LANDSCAPE` |
|`--no-reset`|false| 【弃用】 - 会话（session）之间不重置应用状态（IOS: 不删除应用的 plist 文件；Android：在创建一个新的session前不删除应用） ||
|`--full-reset`|false| 【弃用】 - （iOS）删除整个模拟器目录。（Android）通过卸载应用（而不是清除数据）重置应用状态。在 Android 中会话（session）完成后也会删除应用。 ||
|`--app-pkg`|null| 【弃用】 - （仅 Android）想要运行的 apk 的 java 包（例如， com.example.android.myApp） | `--app-pkg com.example.android.myApp`|
|`--app-activity`|null| 【弃用】 - （仅 Android）打开应用时，想要启动的 Activity 的名称（例如 MainActivity） | `--app-activity MainActivity` |
|`--app-wait-package`|false| 【弃用】 - （仅 Andorid）想要等待的 activity 的包名（例如 com.example.android.myApp） | `--app-wait-package com.example.android.myApp` |
|`--app-wait-activity`|false| 【弃用】 - （仅 Andorid）想要等待的 activity 名（例如 SplashActivity） | `--app-wait-activity SplashActivity` |
|`--device-ready-timeout`|5| 【弃用】 - （仅 Andorid）等待设备准备就绪的超时时间（单位：秒）| `--device-ready-timeout 5` |
|`--android-coverage`|false| 【弃用】 - （仅 Andorid）完全符合条件的 instrumentation 类，作为命令 adb shell am instrument -e coverage true -w 中的 -w 的参数 | `--android-coverage com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation` |
|`--avd`|null| 【弃用】 - （仅 Andorid）要启动的安卓虚拟设备的名称 | `--avd @default` |
|`--avd-args`|null| 【弃用】 - （仅 Andorid）启动安装虚拟设备时额外的模拟器参数 | `--avd-args -no-snapshot-load` |
|`--use-keystore`|false| 【弃用】 - （仅 Andorid）设置 apk 签名的 keystore||
|`--keystore-path`|&lt;user&gt;/.android/debug.keystore|  【弃用】 - （仅 Andorid）keystore 的路径 ||
|`--keystore-password`|android| 【弃用】 - （仅 Andorid）keystore 的密码||
|`--key-alias`|androiddebugkey| 【弃用】 - （仅 Andorid）key 的别名||
|`--key-password`|android| 【弃用】 - （仅 Andorid）key 的密码 ||
|`--intent-action`|android.intent.action.MAIN| 【弃用】 - （仅 Andorid）用于启动 activity 的 Intent action | `--intent-action android.intent.action.MAIN` |
|`--intent-category`|android.intent.category.LAUNCHER| 【弃用】 - （仅 Andorid）用于启动 activity 的 Intent category | `--intent-category android.intent.category.APP_CONTACTS` |
|`--intent-flags`| 0x10200000| 【弃用】 - （仅 Andorid）启动 activity 的标识 | `--intent-flags 0x10200000` |
|`--intent-args`|null| 【弃用】 - （仅 Andorid）启动 activity 时附带额外的 intent 参数 | `--intent-args 0x10200000` |
|`--dont-stop-app-on-reset`|false| 【弃用】 - （仅 Andorid）用于设置 appium 重启时是否先杀掉 app ||
|`--calendar-format`|null| 【弃用】 - （仅 iOS）iOS 模拟器的日历格式 | `--calendar-format gregorian` |
|`--native-instruments-lib`|false| 【弃用】 - （仅 iOS）iOS 内建了一个怪异的不可能避免的延迟，我们在Appium里修复了它，如果你想用原来的，你可以使用这个参数 ||
|`--keep-keychains`|false| 【弃用】 - （仅 iOS） 当 Appium 启动或者关闭的时候，是否保留keychains（Library / Keychains） ||
|`--localizable-strings-dir`|en.lproj| 【弃用】 - （仅 iOS）Localizable.strings 与目录的相对路径         | `--localizable-strings-dir en.lproj` |
|`--show-ios-log`|false| 【弃用】 - （仅 iOS）如果设置了，iOS 系统日志将会输出到终端 ||
|`--relaxed-security`|false|禁用额外的安全检查，因此可以使用支持此选项的驱动程序提供的某些高级功能。只有当所有客户端都位于可信任网络中，才启用它；如果客户端可能会突破会话沙箱，则不应该启用它。||

---
EOF.

本文由 [testly](https://github.com/testly) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。

翻译：@[Pandorym](https://github.com/Pandorym)
Last english version: 1d2f4d62ac83cc37eae848c0067722d5727863da, May 10, 2019
