# Appium服务器参数

Appium v1.5里某些服务器参数已被弃用，取而代之使用的-default-capabilities 标志。

用法：node . [标志]

## 服务器标志
所有标志都是可选的，但是有些必须跟指定标志组合使用才生效。



<expand_table>

| 标志                              | 默认值                              | 描述                                       | 示例                                       |
| ------------------------------- | :------------------------------- | ---------------------------------------- | ---------------------------------------- |
| `--shell`                       | 无                                | 进入 REPL 模式                               |                                          |
| `--ipa`                         | 无                                | (仅iOS)   .ipa 文件的绝对路径                    | `--ipa /abs/path/to/my.ipa`              |
| `-a`, `--address`               | 0.0.0.0                          | 监听的 ip 地址                                | `--address 0.0.0.0`                      |
| `-p`, `--port`                  | 4723                             | 监听的端口                                    | `--port 4723`                            |
| `-ca`, `--callback-address`     | 无                                | 回调ip地址 (默认: 同 --address)                 | `--callback-address 127.0.0.1`           |
| `-cp`, `--callback-port`        | 无                                | 回调端口 (默认: 同 --port)                      | `--callback-port 4723`                   |
| `-bp`, `--bootstrap-port`       | 4724                             | (仅安卓) 设备上跟 Appium通信的端口号                  | `--bootstrap-port 4724`                  |
| `-r`, `--backend-retries`       | 3                                | (仅iOS) 遇到crash或者超时，尝试重启Instruments的次数    | `--backend-retries 3`                    |
| `--session-override`            | false                            | 允许session覆盖 (如有冲突)                       |                                          |
| `-l`, `--pre-launch`            | false                            | 首次建立session时预启动应用 (iOS 需要 –app参数，Android需要 –app-pkg和 –app-activity参数) |                                          |
| `-g`, `--log`                   | 无                                | 将日志输出到指定文件                               | `--log /path/to/appium.log`               |
| `--log-level`                   | debug                            | 日志等级；默认 (控制台[:file]): 调试[:debug]         | `--log-level debug`                      |
| `--log-timestamp`               | false                            | 在终端输出里显示时间戳                              |                                          |
| `--local-timezone`              | false                            | 时间戳使用本地时区                                |                                          |
| `--log-no-colors`               | false                            | 终端输出不显示颜色                                |                                          |
| `-G`, `--webhook`               | 无                                | 同时发送日志到 HTTP 监听器                         | `--webhook localhost:9876`               |
| `--safari`                      | false                            | (仅iOS) 使用safari应用程序                      |                                          |
| `--default-device`, `-dd`       | false                            | (仅iOS模拟器) Instruments启动时使用的默认模拟器         |                                          |
| `--force-iphone`                | false                            | (仅iOS) 不管应用程序指定什么设备，强制使用iPhone模拟器        |                                          |
| `--force-ipad`                  | false                            | (仅iOS) 不管应用程序指定什么设备，强制使用iPad模拟器          |                                          |
| `--tracetemplate`               | 无                                | (仅iOS) 指定Instruments所使用的.tracetemplate文件 | `--tracetemplate /Users/me/Automation.tracetemplate` |
| `--instruments`                 | 无                                | (仅iOS) Instruments二进制文件路径                | `--instruments /path/to/instruments`     |
| `--nodeconfig`                  | 无                                | 指定 JSON格式的配置文件，用来在selenium grid里注册appium | `--nodeconfig /abs/path/to/nodeconfig.json` |
| `-ra`, `--robot-address`        | 0.0.0.0                          | robot使用的IP地址                             | `--robot-address 0.0.0.0`                |
| `-rp`, `--robot-port`           | -1                               | robot使用的端口号                              | `--robot-port 4242`                      |
| `--selendroid-port`             | 8080                             | 用于和Selendroid通信的本地端口                     | `--selendroid-port 8080`                 |
| `--chromedriver-port`           | 9515                             | ChromeDriver 运行使用的端口                     | `--chromedriver-port 9515`               |
| `--chromedriver-executable`     | 无                                | ChromeDriver可执行文件的路径                     |                                          |
| `--show-config`                 | false                            | 打印appium服务器的配置信息，然后退出                    |                                          |
| `--no-perms-check`              | false                            | 绕过Appium检查，确保用户可读/写必要的文件                 |                                          |
| `--strict-caps`                 | false                            | 如果所选设备是appium不承认的有效设备，会导致会话失败            |                                          |
| `--isolate-sim-device`          | false                            | Xcode 6存在一个bug，那就是一些平台上如果其他模拟器设备先被删除时某个特定的模拟器只能在没有任何错误的情况下被建立。这个选项导致了Appium不得不删除除了正在使用设备以外其他所有的设备。请注意这是永久性删除，你可以使用simctl或xcode管理被Appium使用的设备类别。 |                                          |
| `--tmp`                         | 无                                | 可以被Appium用来管理临时文件的目录（绝对路径），比如存放需要移动的内置iOS应用程序。在*nix/Mac上默认为 /tmp，在Windows上默认为 C:\Windows\Temp |                                          |
| `--trace-dir`                   | 无                                | 用于保存iOS instruments trace的 appium 目录，是绝对路径， 默认为/appium-instruments |                                          |
| `--debug-log-spacing`           | false                            | 在日志中加大间距来帮助进行视觉检查                        |                                          |
| `--suppress-adb-kill-server`    | false                            | (仅安卓) 如果设置了，可以阻止Appium杀掉adb实例            |                                          |
| `--async-trace`                 | false                            | 添加长堆栈追踪到日志实体，建议仅调试时选用                    |                                          |
| `--webkit-debug-proxy-port`     | 27753                            | (仅iOS) 用于ios-webkit-debug-proxy通信的本地端口   | `--webkit-debug-proxy-port 27753`        |
| `-dc`, `--default-capabilities` | {}                               | 设置默认desired capabilities，每个会话都将使用默认desired capabilities，除非被新的capabilities覆盖 | `--default-capabilities [ '{"app": "myapp.app", "deviceName": "iPhone Simulator"}' | /path/to/caps.json ]` |
| `--reboot`                      | false                            | - (仅安卓)  每次建立会话重启模拟器，会话结束后杀掉模拟器          |                                          |
| `--command-timeout`             | 60                               | [弃用] 默认所有会话接收命令的超时时间 (单位是秒，但不超过2147483秒)。已被newCommandTimeout关键字替代 |                                          |
| `-k`, `--keep-artifacts`        | false                            | [弃用] - 保留Instruments trace目录，请参考--trace-dir标志 |                                          |
| `--platform-name`               | 无                                | [弃用] -移动平台名称: iOS，Android或 FirefoxOS     | `--platform-name iOS`                    |
| `--platform-version`            | 无                                | [弃用] - 移动平台的版本号                          | `--platform-version 7.1`                 |
| `--automation-name`             | 无                                | [弃用] - 自动化工具的名称: Appium 或 Selendroid    | `--automation-name Appium`               |
| `--device-name`                 | 无                                | [弃用] - 要使用的移动设备的名称                       | `--device-name iPhone Retina (4-inch), Android Emulator` |
| `--browser-name`                | 无                                | [弃用] - 移动浏览器的名称: Safari 或者 Chrome        | `--browser-name Safari`                  |
| `--app`                         | 无                                | [弃用] - IOS: 基于模拟器编译的.app文件的绝对路径或者设备上目标的BundleId； Android: .apk文件的绝对路径 | `--app /abs/path/to/my.app`              |
| `-lt`, `--launch-timeout`       | 90000                            | [弃用] - (仅iOS) Instruments启动等待时间（单位: ms）  |                                          |
| `--language`                    | 无                                | [弃用] -iOS模拟器/Android模拟器的语言               | `--language en`                          |
| `--locale`                      | 无                                | [弃用] -iOS模拟器/Android模拟器的区域               | `--locale en_US`                         |
| `-U`, `--udid`                  | 无                                | [弃用] - 连接的物理设备的udid                      | `--udid 1adsf-sdfas-asdf-123sdf`         |
| `--orientation`                 | 无                                | [弃用] - (仅iOS) 初始化请求时，使用LANDSCAPE或者PORTRAIT | `--orientation LANDSCAPE`                |
| `--no-reset`                    | false                            | [弃用] -  session之间不充值应用状态 (IOS: 不删除应用的 plist 文件；Android: 在创建一个新的session前不删除应用。) |                                          |
| `--full-reset`                  | false                            | [弃用] - (iOS)  删除整个模拟器目录。 (Android) 通过卸载应用（而不是清楚数据）重置应用状态。在Android上session完成后也会删除应用。 |                                          |
| `--app-pkg`                     | 无                                | [弃用] - (仅安卓) 想要运行的apk的java包 (例如， com.example.android.myApp) | `--app-pkg com.example.android.myApp`    |
| `--app-activity`                | 无                                | [弃用] - (仅安卓) 打开应用时，想要启动的Activity的名称（例如 MainActivity） | `--app-activity MainActivity`            |
| `--app-wait-package`            | false                            | [弃用] - (仅安卓) 想要等待的activity的包名 (例如 com.example.android.myApp) | `--app-wait-package com.example.android.myApp` |
| `--app-wait-activity`           | false                            | [弃用] - (仅安卓) 想要等待的activity名（例如 SplashActivity） | `--app-wait-activity SplashActivity`     |
| `--device-ready-timeout`        | 5                                | [弃用] - (仅安卓) 等待设备准备就绪的时间(单位: 秒)          | `--device-ready-timeout 5`               |
| `--android-coverage`            | false                            | [弃用] - (仅安卓) 完全符合条件的instrumentation类，作为命令 adb shell am instrument -e coverage true -w 的 -w 的参数 | `--android-coverage com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation` |
| `--avd`                         | 无                                | [弃用] - (仅安卓) 要启动的avd的名称                  | `--avd @default`                         |
| `--avd-args`                    | 无                                | [弃用] - (仅安卓) 启动avd时额外的模拟器参数              | `--avd-args -no-snapshot-load`           |
| `--use-keystore`                | false                            | [弃用] - (仅安卓)  设置签名apk的keystore           |                                          |
| `--keystore-path`               | <user>/.android/debug.keystore   | [弃用] - (仅安卓) keystore 的路径                |                                          |
| `--keystore-password`           | android                          | [弃用] - (仅安卓) keystore的密码                 |                                          |
| `--key-alias`                   | androiddebugkey                  | [弃用] - (仅安卓) Key的别名                      |                                          |
| `--key-password`                | android                          | [弃用] - (仅安卓) Key 的密码                     |                                          |
| `--intent-action`               | android.intent.action.MAIN       | [弃用] - (仅安卓) 用于启动activity的Intent  action | `--intent-action android.intent.action.MAIN` |
| `--intent-category`             | android.intent.category.LAUNCHER | [弃用] - (仅安卓) 用于启动activity的Intent category | `--intent-category android.intent.category.APP_CONTACTS` |
| `--intent-flags`                | 0x10200000                       | [弃用] - (仅安卓) 启动activity的标志               | `--intent-flags 0x10200000`              |
| `--intent-args`                 | 无                                | [弃用] - (仅安卓)启动activity时附带额外的intent参数     | `--intent-args 0x10200000`               |
| `--dont-stop-app-on-reset`      | false                            | [弃用] - (仅安卓) 用于设置appium重启时是否先杀掉app       |                                          |
| `--calendar-format`             | 无                                | [弃用] - (仅iOS) iOS模拟器的日历格式                | `--calendar-format gregorian`            |
| `--native-instruments-lib`      | false                            | [弃用] - (仅iOS) iOS 内建了一个怪异的不可能避免的延迟，我们在Appium里修复了它，如果你想用原来的，你可以使用这个参数 |                                          |
| `--keep-keychains`              | false                            | [弃用] - (仅iOS) 当Appium启动或者关闭的时候，是否保留keychains(Library/Keychains) |                                          |
| `--localizable-strings-dir`     | en.lproj                         | [弃用] - (仅iOS)定位.strings所在目录的相对路径         | `--localizable-strings-dir en.lproj`     |
| `--show-ios-log`                | false                            | [弃用] - (仅iOS) 如果设置了，iOS系统日志会输出到终端        |                                          |
|`--enable-heapdump`|false|激活 NodeJS 内存 dumps 收集功能。这个功能对找到内存泄露非常有用。用 'kill -SIGUSR2 &lt;PID&gt;' 命令来创建 node 进程的内存堆栈dump，只有在 *nix 系统有效。dump 文件会被创建在 appium 运行的目录，文件使用 *.heapsnapshot 做后缀。如果后续想要深入研究，这个快照可以被加载到 Chrome Inspector 里去。参加 [Rising Stack article](https://blog.risingstack.com/finding-a-memory-leak-in-node-js/) for more details.||

本文由 [testly](https://github.com/testly) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。