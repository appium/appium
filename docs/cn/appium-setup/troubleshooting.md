## Appium 的故障排查

当你在使用过程中遇到了问题，先别急着到 github 上提交反馈，或者到 [appium-discuss discussion group](https://discuss.appium.io) 提问。可以先试试在本文中能否找到解决的办法。

### 常见问题

* 确保你是跟着 [README](/README.md) 中的每一步来做。
* 确保你的系统已经配置好所需环境（例如. Xcode 已更至最新，Android SDK 已经安装好，而且`ANDROID_HOME`也设置无误）。
* 确保你应用的存放路径是正确的。
* 在 windows 上运行 appium.app 要使用管理员权限，假如你在 cmd 中运行，也得确保是在管理员权限下。

### 如果你是通过 Appium.app 运行

* 升级应用并重启。如果你被告知应用无法升级，请到 [appium.io](http://appium.io) 重新下载。

### 如果你是通过 Appium 的源码运行

* 通过 `git pull` 命令拉取代码，确保当前的代码是最新的
* 移除旧的依赖：`rm -rf node_modules`
* 重新安装依赖：`npm install`
* 代码 Re-transpile: `gulp transpile`

* 你可以使用 [Appium Doctor](https://github.com/appium/appium-doctor) 去检测 Appium 环境是否已经配置好了。
* 如果你升级到 Android SDK 22 后出现如下报错：
  `{ANDROID_HOME}/tools/ant/uibuild.xml:155: SDK does not have any Build Tools installed.`
在 Android SDK 22 中，platform 与 build tools 分别被拆分到各自的 SDK 管理包中去了。你需要确保已经正确安装了 build-tools 与 platform-tools。

### Android

* 确保 Android 模拟器已经开启并在运行中。
* 出现设备连接问题时， `adb kill-server && adb devices` 这行命令非常有用。它可以重置你的 Android 设备的连接。
* 确保你已经设置了 ANDROID_HOME 已经指向了 Android SDK 路径


### Windows

* 确保已经开启了开发者模式。
* 确保 command prompt 已经是管理员权限。
* 检查 Appium 服务器正在监听的 URL 是否与你测试脚本中的 URL 匹配的上。

### IOS

* 确保 Instruments.app 没有被开启。
* 如果你使用模拟器时，记得不要让真机连上你的电脑。
* 确保在手机的设置中的 accessibility 辅助功能是关闭的。
* 确保应用是变异在当前运行的模拟器上。
* 确保应用已编译在合适的模拟器（或真机）上（例如. 在模拟器上运行需要 debug 模式的包），否则你会出现`posix spawn`报错。
* 如果你曾经用 sudo 运行过 Appium，你可能需要运行 `sudo rm /tmp/instruments_sock` 该命令，而且记住以后尽量别带上 sudo。
* 如果你是第一次运行 Appium，记得对 Instruments 进行授权。 查阅 [running on OSX documentation](./running-on-osx.md#authorizing-ios-on-the-computer) 了解更多。
* 如果在真机上运行 Instruments 出现了崩溃("exited with code 253")，确保 Xcode 已经下载了设备的符号文件。到 Window -> Devices，然后他就会自动的开始下载。每次 iOS 版本升级后都需要做这步。
* 如果你看到 `iOS Simulator failed to install the application.` 这样的报错，并且确定路径没有设置错误的话，那你可以尝试去重启你的电脑。
* 确保你的 macOS 上的 keychain 已经保存了用于构建你的应用的证书，并且 WebDeriverAgent 是已签名的。特别是你在使用 ssh 的情况下。通常失败的话会显示`签名`报错。
* 如果你的应用中还有自定义的元素，他们或许不能通过默认的方式去使用 UIAutomaion（and therefore Appuim）进行自动化。你需要将 accessibility status 设置为'enabled'。在代码中设置的方式如下：

  ```center
  [myCustomView setAccessibilityEnabled:YES];
  ```

* 在 iOS 上测试可能会出现类似内存泄露（包括性能不佳、程序挂起）的状况。如果你出现了类似的问题，这很可能是由于一个 NSLog 的已知问题所导致的。其中的一个解决办法就是将所有的 NSLog 代码移除。然而，还是有一些巧妙的处理方法，可以不重构就能解决。

  ### 解决办法 1
  NSLog 是一个宏且可以被定义的。例如：
  ```objectivec
  // *You'll need to define TEST or TEST2 and then recompile.*

  #ifdef TEST
    #define NSLog(...) _BlackHoleTestLogger(__VA_ARGS__);
  #endif // TEST
  #ifdef TEST2
    #define NSLog(...) _StdoutTestLogger(__VA_ARGS__);
  #endif // TEST2

  void _BlackHoleTestLogger(NSString *format, ...) {
      //
  }

  void _StdoutTestLogger(NSString *format, ...) {
      va_list argumentList;
      va_start(argumentList, format);
      NSMutableString * message = [[NSMutableString alloc] initWithFormat:format
                                                  arguments:argumentList];

      printf(message);

      va_end(argumentList);
      [message release];
  }
  ```

  ### 解决办法 2
  手动去替换掉 NSLog 封装的底层功能。该方法被 [Apple in a similar context.](https://support.apple.com/kb/TA45403?locale=en_US&viewlocale=en_US) 所推荐
  ```objectivec
  extern void _NSSetLogCStringFunction(void(*)(const char *, unsigned, BOOL));

  static void _GarbageFreeLogCString(const char *message, unsigned length, BOOL withSyslogBanner) {
     fprintf(stderr, "%s\\n", message);
  }

  int main (int argc, const char *argv[]) {
     NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
     int exitCode;

     setbuf(stderr, NULL);

     _NSSetLogCStringFunction(_GarbageFreeLogCString);
     exitCode = WOApplicationMain(@"Application", argc, argv);
     [pool release];
     return exitCode;
  }
```


### Webview/Hybrid/Safari 应用的支持

* 确保真机上的 'Web Inspector' 为打开状态。
* 确保你已经打开 Safari 的开发者模式（Safari - Advance Preferences- Developer menu for simulators）。
* 确保你客户端的库提供的 appium 命令 `context` 可以让你正确地切换 contexts。
* 当你尝试打开代理的时候，出现了这个报错：select_port() failed，请查阅该[文档](https://groups.google.com/forum/#!topic/appium-discuss/tw2GaSN8WX0)。
* 在 Safari session 中，如果日志记录到不能输入初始 url 的问题，先确保你的软键盘是否已被开启，详情请查阅该[文档](https://github.com/appium/appium/issues/6440)。

### 到社区寻求帮助

如果上述步骤还没解决你的问题，那你可以通过以下方式获得帮助：

当你在使用 Appium 的过程中有任何问题，而且 Appium 提供的报错信息不够清晰的话，欢迎加入[讨论组](https://discuss.appium.io)与大家进行讨论。提问时请附带上如下信息：

* 你是通过什么方式运行 Appium(Appium.app, npm, source)。
* 你使用什么操作系统。
* 你是针对什么设备和版本去做测试的（例如. Android 4.4, 或者 iOS 7.1）。
* 你是使用真机还是模拟器去做测试。
* 提供客户端和服务端给出的的错误（例如. “在运行我的 Python 测试脚本时候出现了异常，Appium 服务器的报错信息如链接中所示”）。
* 除了上述，在提问的时候希望可以附带上 Appium 服务器输出的内容（特别是在 verbose 模式下），这样我们就可以更好地分析并跟进问题。

如果你确信你发现的是一个 bug，请直接到 [issue tracker](https://github.com/appium/appium/issues) 去提交一个 issue 去描述 bug 的信息以及重现步骤。

### 已知问题

* 如果你已在官网下载并安装 Node，你需要使用 sudo 去运行 `npm`。可这么做这并不理想。可以尝试通过 [nvm](https://github.com/creationix/nvm), [n](https://github.com/visionmedia/n) 或者 `brew install node` 这几种方式去安装！
* 通过设置代理，iOS 真机可以支持 Webview 了，详情可查看[讨论](https://groups.google.com/d/msg/appium-discuss/u1ropm4OEbY/uJ3y422a5_kJ)。
* 有时候 iOS 的 UI 元素在被定位到后的几毫秒间会失效，这会导致一个类似 `(null) cannot be tapped` 的报错。唯一的解决办法就是把  finding-and-clicking 的代码放进一个 retry block 中。
* 如果你是通过 MacPorts 去安装 Node 与 npm，Appium 可能很难找到可执行的 `node`。你必须确保 MacoPorts 的 bin 文件夹(默认是 `/opt/local/bin`)已经添加到你的 `~/.profile`, `~/.bash_profile` 或者 `~/.bashrc` 中的 `PATH` 环境变量中。

### 特定的错误

|Action|Error|Resolution|
|------|-----|----------|
|Running ios test|`[INST STDERR] posix spawn failure; aborting launch`|你的应用没有分别对应模拟器或者真机去编译对应版本.|
|Running mobile safari test|`error: Could not prepare mobile safari with version '7.1'`|你可能需要再次运行授权的脚本以确保 iOS SDK 文件是可写状态。详情请查阅 [running on OSX documentation](./running-on-osx.md#authorizing-ios-on-the-computer)|

本文由 [thanksdanny](https://testerhome.com/thanksdanny) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。