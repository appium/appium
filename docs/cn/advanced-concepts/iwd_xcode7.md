## 为 xcode 7 和 iOS >= 9.0 配置无延迟 instruments（iwd）

iOS >= 9.0 时，需要手动通过命令行传递二进制文件来配置无延迟的 instruments （在 xcode < 7 时 appium 会自动加上 ），参阅 [iwd](https://github.com/lawrencelomax/instruments-without-delay/tree/xcode7-quirks#xcode-7--ios-9-support)

在 xcode >= 7 时启用 iwd ：
- 下载 [appium-instruments](https://github.com/appium/appium-instruments)
- 在 `<appium-instruments>/bin/` 下根据以下指示的参数运行 `xcode-iwd.sh` ：

```
sh <appium-instruments>/bin/xcode-iwd.sh <path to xcode> <path to appium-instruments>
```
比如： `sh ./bin/xcode-iwd.sh /Applications/Xcode.app /Users/xyz/appium-instruments/`

注意：Xcode 7 的 iwd 只在 iOS >= 9.0 时有效，你可以在 iOS < 9.0 时切换一个旧版本的 Xcode

由 @黑水 翻译，TesterHome 社区 id：sanlengjingvv
由 [@chenhengjie123](https://github.com/chenhengjie123) 校验
