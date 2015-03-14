## Appium 服务关键字

<expand_table>

|关键字|描述|实例|
|----|-----------|-------|
|`automationName`|你想使用的自动化测试引擎|`Appium` (默认) 或 `Selendroid`|
|`platformName`|你要测试的手机操作系统|`iOS`, `Android`, 或 `FirefoxOS`|
|`platformVersion`|手机操作系统版本|例如： `7.1`, `4.4`|
|`deviceName`|使用的手机类型或模拟器类型|`iPhone Simulator`, `iPad Simulator`, `iPhone Retina 4-inch`, `Android Emulator`, `Galaxy S4`, 等。在 iOS 上，这个关键字的值必须是使用 `instruments -s devices` 得到的可使用的设备名称之一。在 Android 上，这个关键字目前不起作用。|
|`app`|`.ipa` or `.apk`文件所在的本地绝对路径或者远程路径,也可以是一个包括两者之一的`.zip`。 Appium会先尝试安装路径对应的应用在适当的真机或模拟器上。针对Android系统，如果你指定`app-package`和`app-activity`(具体见下面)的话，那么就可以不指定`app`。 **会与 `browserName` 冲突** |比如`/abs/path/to/my.apk`或`http://myapp.com/app.ipa`|
|`browserName`|需要进行自动化测试的手机 web 浏览器名称。如果是对应用进行自动化测试，这个关键字的值应为空。|iOS 系统上可以用 'Safari' ，Android 系统上可以用 'Chrome', 'Chromium', 或 'Browser'。|
|`newCommandTimeout`|设置命令超时时间，单位：秒。达到超时时间仍未接收到新的命令时 Appium 会假设客户端退出然后自动结束会话。|比如 `60`
|`autoLaunch`|Appium是否需要自动安装和启动应用。默认值`true`|`true`, `false`|
|`language`|  (Sim/Emu-only) 设定模拟器 ( simulator / emulator ) 的语言。|如： `fr`|
|`locale`|  (Sim/Emu-only) 设定模拟器 ( simulator / emulator ) 的区域设置。|如： `fr_CA`|
|`udid`| 连接的物理设备的唯一设备标识|如： `1ae203187fc012g`|
|`orientation`| (Sim/Emu-only) 在一个设定的方向模式中开始测试|`LANDSCAPE` (横向)  或 `PORTRAIT` (纵向) |
|`autoWebview`| 直接转换到 WebView 上下文。 默认值 `false`、|`true`, `false`|
|`noReset`|不要在会话前重置应用状态。默认值`false`。|`true`, `false`|
|`fullReset`|(iOS) 删除整个模拟器目录。(Android) 通过卸载——而不是清空数据——来重置应用状态。在 Android 上，这也会在会话结束后自动清除被测应用。默认值 `false`|`true`, `false`|

### Android特有

<expand_table>

|关键字|描述|实例|
|----|-----------|-------|
|`appActivity`| 你要从你的应用包中启动的 Android Activity 名称。它通常需要在前面添加 `.`  (如：使用`.MainActivity` 而不是 `MainActivity`) |`MainActivity`, `.Settings`|
|`appPackage`| 你想运行的Android应用的包名|比如`com.example.android.myApp`, `com.android.settings`|
|`appWaitActivity`| 你想要等待启动的 Android Activity 名称|`SplashActivity`|
|`deviceReadyTimeout`| 设置等待一个模拟器或真机准备就绪的超时时间|`5`|
|`androidCoverage`| 用于执行测试的 instrumentation 类。作为命令 `adb shell am instrument -e coverage true -w` 的 `-w` 参数。| `com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation`|
|`enablePerformanceLogging`| (仅适用于 Chrome 和 webview) 开启 Chromedriver 的性能日志。 (默认 `false`) | `true`, `false`|
|`androidDeviceReadyTimeout`|等待设备在启动应用后准备就绪的超时时间。以秒为单位。|如 `30`|
|`androidDeviceSocket`|开发工具的 socket 名称。只有在被测应用是一个使用 Chromium 内核的浏览器时需要。 socket 会被浏览器打开，然后 Chromedriver 把它作为开发者工具来进行连接。|如 `chrome_devtools_remote`|
|`avd`| 需要启动的 AVD  (安卓虚拟设备) 名称。|如 `api19`|
|`avdLaunchTimeout`| 以毫秒为单位，等待 AVD 启动并连接到 ADB 的超时时间。(默认值 `120000`)| `300000`|
|`avdReadyTimeout`| 以毫秒为单位，等待 AVD 完成启动动画的超时时间。(默认值 `120000`)| `300000`|
|`avdArgs`| 启动 AVD 时需要加入的额外的参数。|如 `-netfast`|
|`useKeystore`| 使用一个自定义的 keystore 来对 apk 进行重签名。默认值 `false`|`true` or `false`|
|`keystorePath`| 自定义 keystore 的路径。默认： ~/.android/debug.keystore|如 `/path/to.keystore`|
|`keystorePassword`| 自定义 keystore 的密码。|如 `foo`|
|`keyAlias`| key 的别名 |如 `androiddebugkey`|
|`keyPassword`| key 的密码 |如 `foo`|
|`chromedriverExecutable`| webdriver 可执行文件的绝对路径 (如果 Chromium 核心提供了对应的 webdriver， 应该用它代替 Appium 自带的 webdriver) |`/abs/path/to/webdriver`|
|`autoWebviewTimeout`| 以毫秒为单位，等待 Webview 上下文激活的时间。默认值 `2000`| 如 `4`|
|`intentAction`| 用于启动 activity 的 intent action。 (默认值 `android.intent.action.MAIN`)| 如 `android.intent.action.MAIN`, `android.intent.action.VIEW`|
|`intentCategory`| 用于启动 activity 的 intent category。 (默认值 `android.intent.category.LAUNCHER`)  | 如 `android.intent.category.LAUNCHER`, `android.intent.category.APP_CONTACTS`
|`intentFlags`| 用于启动 activity 的标识 ( flags )  (默认值 `0x10200000`)  | 如 `0x10200000`
|`optionalIntentArguments`| 用于启动 activity 的额外 intent 参数。请查看 [Intent 参数](http://developer.android.com/tools/help/adb.html#IntentSpec) | 如 `--esn <EXTRA_KEY>`, `--ez <EXTRA_KEY> <EXTRA_BOOLEAN_VALUE>`
|`stopAppOnReset`| 在使用 adb 启动应用前停止被测应用的进程 ( process ) 。如果被测应用是被另一个应用创建的，当这个参数被设定为 false 时，允许另一个应用的进程在使用 adb 启动被测应用时继续存活。默认值 `true`| `true` 或 `false`|
|`unicodeKeyboard`| 使用 Unicode 输入法。默认值 `false`| `true` 或 `false`|
|`resetKeyboard`| 在设定了 `unicodeKeyboard` 关键字的 Unicode 测试结束后，重置输入法到原有状态。如果单独使用，将会被忽略。默认值 `false`| `true` 或 `false`|
|`noSign`| 跳过检查和对应用进行 debug 签名的步骤。只能在使用 UiAutomator 时使用，使用 selendroid 是不行。默认值 `false` | `true` 或 `false`|
|`ignoreUnimportantViews`| 调用 uiautomator 的函数 `setCompressedLayoutHierarchy()`。由于 Accessibility 命令在忽略部分元素的情况下执行速度会加快，这个关键字能加快测试执行的速度。被忽略的元素将不能够被找到，因此这个关键字同时也被实现成可以随时改变的 *设置 ( settings ) * 。默认值 `false` | `true` 或 `false`

### iOS特有

<expand_table>

|关键字|描述|实例|
|----|-----------|-------|
|`calendarFormat`| (Sim-only) 为iOS的模拟器设置日历格式|如 `gregorian` (公历) |
|`bundleId`| 被测应用的 bundle ID 。用于在真实设备中启动测试，也用于使用其他需要 bundle ID 的关键字启动测试。在使用 bundle ID 在真实设备上执行测试时，你可以不提供 `app` 关键字，但你必须提供 `udid` 。|如 `io.appium.TestApp`|
|`udid`| 连接的真实设备的唯一设备编号 ( Unique device identifier ) |如 `1ae203187fc012g`|
|`launchTimeout`| 以毫秒为单位，在 Appium 运行失败之前设置一个等待 instruments 的时间 |比如： `20000`|
|`locationServicesEnabled`| (Sim-only) 强制打开或关闭定位服务。默认值是保持当前模拟器的设定|`true` 或 `false`|
|`locationServicesAuthorized`| (Sim-only) 通过修改 plist 文件设定是否允许应用使用定位服务，从而避免定位服务的警告出现。默认值是保持当前模拟器的设定。请注意在使用这个关键字时，你同时需要使用 `bundleId` 关键字来发送你的应用的 bundle ID。|`true` 或者 `false`|
|`autoAcceptAlerts`| 当 iOS 的个人信息访问警告 (如 位置、联系人、图片) 出现时，自动选择接受( Accept )。默认值 `false`。|`true` 或者 `false`|
|`autoDismissAlerts`| 当 iOS 的个人信息访问警告 (如 位置、联系人、图片) 出现时，自动选择不接受( Dismiss )。默认值 `false`。|`true` 或者 `false`|
|`nativeInstrumentsLib`| 使用原生 intruments 库 (即关闭 instruments-without-delay ) |`true` 或者 `false`|
|`nativeWebTap`| (Sim-only) 在Safari中允许"真实的"，非基于 javascript 的 web 点击 (tap) 。 默认值： `false`。注意：取决于 viewport 大小/比例， 点击操作不一定能精确地点中对应的元素。|`true` 或者 `false`|
|`safariInitialUrl`| (Sim-only) (>= 8.1) 初始化 safari 的时使用的地址。默认是一个本地的欢迎页面 | 如 `https://www.github.com` |
|`safariAllowPopups`| (Sim-only) 允许 javascript 在 Safari 中创建新窗口。默认保持模拟器当前设置。|`true` 或者 `false`|
|`safariIgnoreFraudWarning`| (Sim-only) 阻止 Safari 显示此网站可能存在风险的警告。默认保持浏览器当前设置。|`true` 或者 `false`|
|`safariOpenLinksInBackground`| (Sim-only) Safari 是否允许链接在新窗口打开。默认保持浏览器当前设置。|`true` 或者 `false`|
|`keepKeyChains`| (Sim-only) 当 Appium 会话开始/结束时是否保留存放密码存放记录 (keychains)  (库(Library)/钥匙串(Keychains)) |`true` 或者 `false`|
|`localizableStringsDir`| 从哪里查找本地化字符串。默认值 `en.lproj`|`en.lproj`|
|`processArguments`| 通过 instruments 传递到 AUT 的参数 |如 `-myflag`|
|`interKeyDelay`| 以毫秒为单位，按下每一个按键之间的延迟时间。|如 `100`|
|`showIOSLog`| 是否在 Appium 的日志中显示设备的日志。默认值 `false`|`true` 或者 `false`|
|`sendKeyStrategy`| 输入文字到文字框的策略。模拟器默认值：`oneByOne` (一个接着一个) 。真实设备默认值：`grouped` (分组输入)  |`oneByOne`, `grouped` 或 `setValue`|
|`screenshotWaitTimeout`| 以秒为单位，生成屏幕截图的最长等待时间。默认值： 10。 |如 `5`|
|`waitForAppScript`| 用于判断 "应用是否被启动” 的 iOS 自动化脚本代码。默认情况下系统等待直到页面内容非空。结果必须是布尔类型。 |例如 `true;`, `target.elements().length > 0;`, `$.delay(5000); true;` |
