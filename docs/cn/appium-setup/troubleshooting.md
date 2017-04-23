## Troubleshooting Appium
## Appium 的故障排查
Here's what to do if you're experiencing problems, before you submit a ticket
to github or write to the [appium-discuss discussion group](https://discuss.appium.io).


### General
### 常规
* Make sure you've followed the getting started steps in the [README](/README.md)
* 保证你在开始的时候已经读过[README](/README.md)去了解开始步骤
* Make sure your system is set up appropriately (i.e., XCode is updated,
  Android SDK is installed and `ANDROID_HOME` is set.
* 保证你的系统已经设置好相关环境（例如. Xcode 已更至最新，Android SDK 已经安装好，而且`ANDROID_HOME`也设置无误）
* Make sure the paths to your applications are correct
* 保证你的应用所在的路径是正确的
* On windows run appium.app as administrator or when running from source you need to run cmd as administrator.
* 在 windows 上运行 appium.app 要使用管理员权限，加入你在cmd 运行，也得保证是在管理员权限下

### If you're running Appium.app
### 如果你使用的是 Appium.app

* Update the app and restart. If you get a message saying the app can't be updated,
  re-download it from [appium.io](http://appium.io).
* 升级应用并重启。如果你被告知应用无法升级，请到 [appium.io](http://appium.io) 重新下载。

### If you're running Appium from source
### 如果你是通过 Appium 的源码运行

* `git pull` to make sure you're running the latest code
* 通过 `git pull` 命令保证你的代码是最新的
* Remove old dependencies: `rm -rf node_modules`
* 移除旧的依赖：`rm -rf node_modules`
* Re-install dependencies: `npm install`
* 重新安装依赖：`npm install`
* Re-transpile the code: `gulp transpile`


* You can also use [Appium Doctor](https://github.com/appium/appium-doctor) to determine whether your system is configured correctly for Appium.
* 用也可以使用 [Appium Doctor](https://github.com/appium/appium-doctor) 去检测你的 Appium 环境是否已经配置好了。

* If you get this error after upgrading to Android SDK 22:
* 如果你升级到 Android SDK 22 后出现如下报错：
  `{ANDROID_HOME}/tools/ant/uibuild.xml:155: SDK does not have any Build Tools installed.`
In the Android SDK 22, the platform and build tools are split up into their
own items in the SDK manager. Make sure you install the build-tools and platform-tools.
在 Android SDK 22，platform 与 build tools 

### Android

* Make sure the Android emulator is up and running.
* It's sometimes useful to run `adb kill-server && adb devices`. This can
  reset the connection to the Android device.
*  `adb kill-server && adb devices` 这行命令在某些时候非常有用。它可以重置你的 Android 设备的连接。
* Make sure you set ANDROID_HOME pointing to the Android SDK directory
* 确保你已经设置了 ANDROID_HOME 已经指向了 Android SDK 路径


### Windows

* Make sure developer mode is on
* 保证已经开启了开发者模式
* Make sure command prompt is Admin
* 保证 command prompt 已经是管理员权限
* Check that the URL Appium server is listening to matches the one specified in test script
*

### IOS

* Make sure Instruments.app is not open
* 保证 Instruments.app 没有被开启
* If you're running the simulator, make sure your actual device is not
  plugged in
* 如果你使用模拟器时，记得不要数据线连上你的真机
* Make sure the accessibility helper is turned off in your Settings app
* 记得在在设置中将设备设置为可访问状态
* Make sure the app is compiled for the version of the simulator that's being
  run
* 
* Make sure the app is compiled for the simulator (or real device) as
  appropriate (e.g., in debug mode for the simulator), or you might get
  a `posix spawn` error.
* If you've ever run Appium with sudo, you might need to `sudo rm
  /tmp/instruments_sock` and try again as not-sudo.
* 如果你任何时刻运行 Appium 都带上 sudo，你可能需要运行 `sudo rm /tmp/instruments_sock` 该命令，而且以后记得尽量别带上 sudo 了。
* If this is the first time you've run Appium, make sure to authorize the use
  of Instruments. See [running on OSX documentation](./running-on-osx.md#authorizing-ios-on-the-computer).
* 如果你是第一次运行 Appium，记得
* If Instruments is crashing when running against a physical device ("exited with code 253"), ensure Xcode has downloaded device symbols. Go to Window -> Devices, and it should start automatically. This is needed after iOS version upgrades.
* If you see `iOS Simulator failed to install the application.` and the
  paths are correct, try restarting the computer.
* 如果你看到 `iOS Simulator failed to install the application.` 这样的报错，而且确定路径是设置正确的，那你可以尝试去重启你的电脑。
* Make sure your macOS keychain that holds the certificate(s) needed for building your app and the WebDriverAgent is unlocked. Especialy if you are using ssh. General symptom to look for is `codesign` failure.
* 
* If you have custom elements in your app, they will not be automatable by
  UIAutomation (and therefore Appium) by default. You need to set the
  accessibility status to 'enabled' on them. The way to do this in code is:
* 如果你的应用中还有自定义的元素，他们或许不能通过默认的方式去使用 UIAutomaion（and therefore Appuim）进行自动化。你需要将他们的可访问状态设置为'enabled'。在代码中设置的方式如下：

  ```center
  [myCustomView setAccessibilityEnabled:YES];
  ```

* Tests on iOS may exhibit symptoms similar to a memory leak including sluggish
  performance or hangs. If you experience this problem, it's likely due to a
  known issue with NSLog. One option is to remove NSLog from your code.
  However, there are several more nuanced approaches that may also help without
  requiring that you refactor.

  ### Workaround 1
  NSLog is a macro and can be redefined. E.g.,
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

  ### Workaround 2
  Manually replace the underlying function that NSLog wraps. This method was recommended by
  [Apple in a similar context.](https://support.apple.com/kb/TA45403?locale=en_US&viewlocale=en_US)

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


### Webview/Hybrid/Safari app support
### 网页/Hybrid/Safari 应用的支持

* Make Sure you enable the 'Web Inspector' on the real device.
* 保证
* Make Sure you enable the Safari - Advance Preferences- Developer menu for
  simulators.
* Make sure you are properly switching contexts using the `context` appium commands provided by your client library.
* If you getting this error: select_port() failed, when trying to open the
  proxy, see this [discussion](https://groups.google.com/forum/#!topic/appium-discuss/tw2GaSN8WX0)
* In a Safari session, if the logs indicate that the initial url cannot be entered, make sure that
  you have the software keyboard enabled. See this [discussion](https://github.com/appium/appium/issues/6440).

### Let the community know
### 告诉社区让他们知道

Once you've tried the above steps and your issue still isn't resolved,
here's what you can do:
如果你已经试完上面的步骤已经无法解决你的问题，你可以这样做：

If you're having trouble getting Appium working and the error messages Appium
provides are not clear, join the [discussion group](https://discuss.appium.io)
and send a message. Please include the following:
如果你在使用 Appium 的过程中有

* How you're running Appium (Appium.app, npm, source)
* 你是通过什么方式运行 Appium(Appium.app, npm, source)
* What operating system you are using
* 你使用什么操作系统
* What device and version you are testing against (i.e. Android 4.4, or iOS 7.1)
* 你是针对什么设备或者版本去做测试的（例如. Android 4.4, 或者 iOS 7.1）
* Whether you are running against a real device or a simulator/emulator
* 你运行的测试是否是针对真机或者模拟器/仿真器的
* The client-side and server-side errors you're getting (i.e.,
"In Python this is the exception I get in my test script,
and here's a link to a paste of the Appium server output)
* 客户端和服务端的错误你是否理解（例如. "In Python this is the exception I get in my test script,and here's a link to a paste of the Appium server output"）
* Per above, it's very important to include a paste of the Appium server output when it's run in verbose mode so that we can diagnose what's going on.
* 以上，在提问的时候希望可以附带上 Appium 服务器输出的内容（需要在 verbose 模式下），这样我们就可以更好地分析并跟进问题。

If you've found what you believe is a bug, go straight to the [issue tracker](https://github.com/appium/appium/issues)
and submit an issue describing the bug and a repro case.
如果你发现问题且确定是以一个 bug，请直接到 [issue tracker](https://github.com/appium/appium/issues) 去提交一个 issue 去描述 bug 的信息以及重现步骤

### Known Issues2111
### 已知 Issues2111

* If you've installed Node from the Node website, it requires that you use sudo for `npm`. This is not ideal. Try to get node with [nvm](https://github.com/creationix/nvm), [n](https://github.com/visionmedia/n) or `brew install node` instead!
* 如果你已经在的 Node 的官网安装了 Node，在运行 `npm` 命令时候需要带上 sudo。可这并不理想。可以尝试通过 [nvm](https://github.com/creationix/nvm), [n](https://github.com/visionmedia/n) 或者 `brew install node` 这几种方式去安装 node！
* Webview support works on real iOS devices with a proxy, see [discussion](https://groups.google.com/d/msg/appium-discuss/u1ropm4OEbY/uJ3y422a5_kJ).
* 通过设置代理，在 iOS 真机上就可以支持 Webview 了，请查看[讨论](https://groups.google.com/d/msg/appium-discuss/u1ropm4OEbY/uJ3y422a5_kJ)。
* Sometimes iOS UI elements become invalidated milliseconds after they are found. This results in an error that looks like `(null) cannot be tapped`.Sometimes the only solution is to put the finding-and-clicking code in a retry block.
* 有时候 iOS 的 UI 元素在被查找到后会在一瞬间失效，这导致的报错看起来就像 `(null) cannot be tapped`。这唯一的解决办法就是将用于查找与点击的代码放进一个重试 block 中
* Appium may have difficulties finding the `node` executable if you've installed Node and npm via MacPorts. You must make sure that the MacPorts bin folder (`/opt/local/bin` by default) is added to `PATH` somewhere in your `~/.profile`, `~/.bash_profile` or `~/.bashrc`.
* 如果你是通过 MacPorts 去安装 Node 与 npm，Appium 可能很难找到 `node` 去执行。你必须保证 MacoPorts 的 bin 文件夹(默认是 `/opt/local/bin`)已经在你的 `~/.profile`, `~/.bash_profile` 或者 `~/.bashrc` 中已经添加到 `PATH`。

### Specific Errors
### 具体的错误

|Action|Error|Resolution|
|------|-----|----------|
|Running ios test|`[INST STDERR] posix spawn failure; aborting launch`|Your app is not compiled correctly for the simulator or device.|
|Running mobile safari test|`error: Could not prepare mobile safari with version '7.1'`|You probably need to run the authorize script again to make the iOS SDK files writeable. See [running on OSX documentation](./running-on-osx.md#authorizing-ios-on-the-computer)|
