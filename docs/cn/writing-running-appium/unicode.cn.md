## 多语言支持

程序处理非拉丁字符时存在一个的问题：对于带音标的字符，存在多种编码形式。例如，对于`é`这样的字符，有两种编码方式：一种是单独的字符`é`（Unicode中的`LATIN SMALL LETTER E WITH ACUTE`(带有音标的小写的拉丁字母'E'))，另一种是音标在字符后边(`COMBINING ACUTE ACCENT`(字符和音标的组合))。为了解决这个问题，存在一个`normalization` (标准化) 方法，让["每个字符都有一个唯一的二进制表示"](http://www.unicode.org/reports/tr15/)。

幸运的是，对ASCII字符（例如 不需要进行标准化的字符）进行标准化将不会产生任何变化，并且多次进行标准化
操作也不会发生额外的变化。因此，可以对所有字符使用标准化函数而不用担心产生不良影响。

```javascript
// javascript
var unorm = require('unorm');

'some ASCII text' === unorm.nfd('some ASCII text');
unorm.nfd('Adélaïde Hervé') === unorm.nfd(unorm.nfd('Adélaïde Hervé'));
```

在测试的时候遇到Unicode字符，你需要对字符进行标准化，确保期望的值和接收到的值一致。
有很多方法可以用来进行标准化，所以你要确保执行的是同样的方法！

```javascript
// javascript
var unorm = require('unorm');
driver
  .elementByAccessibilityId('find')
    .text()
    .then(function (txt) {
      unorm.nfd(txt).should.be(unorm.nfd("é Œ ù ḍ"));
    });
```

一个由不同unicode文本编码导致的问题的标志是断言失败但报告却显示两个看起来一模一样的字符串：

```shell
AssertionError: expected 'François Gérard' to deeply equal 'François Gérard'
      + expected - actual

      +"François Gérard"
      -"François Gérard"
```

当发生只因编码导致的问题时，输出_看上去_一样。从标准的角度，它们的编码应该也和它们看上去那样相同。


### 查找器 (Finder)

需要被查找的字符也应该需要标准化。比如，你在一个iOS的app上有一个叫做`Найти`的按钮，你也应该在find命令中标准化它。

```javascript
// javascript
var unorm = require('unorm');
driver
  .findElementByXPath(unorm.nfd("//UIAButton[@name='Найти']"))
    .should.eventually.exist;
```

否则这个按钮可能无法被找到。


### 文本框 (Text Field)

默认情况下，iOS和Android的自动化工具都不支持向输入框输入非ASCII字符。

#### iOS

Appium 完全绕过键盘直接向iOS设备的输入框发送非ASCII字符。虽然这让这些文本在测试中被成功输入，但必须记住由键盘输入触发的业务逻辑将不会被测试到。

像上边说的一样，断言收到的文本前应该先标准化它。

```javascript
// javascript
var unorm = require('unorm');
var testText = unorm.nfd("é Œ ù ḍ");
driver
  .elementsByClassName('UIATextField').at(1)
    .sendKeys(testText)
    .text()
    .should.become(testText)
  .nodeify(done);
```

#### Android

通过下载并安装一个[特殊键盘](https://github.com/appium/io.appium.android.ime) ， Android 可以支持输入 Unicode 字符，这个输入法允许文本通过ASCII在Appium和被测应用之间进行通讯。

为了使用这个功能，将`unicodeKeyboard`设置为`true`。如果想要键盘设置在测试完成后自动回到原始状态，
将`resetKeyboard`设置为`true`。否则Appium测试结束后，Appium的Unicode键盘仍然会被激活。

翻译备注：这个Unicode键盘并非虚拟键盘，在界面上不会显示出来，所以要进行其他类型的测试必须切换回其他输入法。

测试时可以通过`send_keys`向输入框输入Unicode字符。

```javascript
// javascript
var desired = {
  app: '/path/to/app',
  deviceName: 'Android Emulator',
  deviceVersion: '4.4',
  platformName: 'Android',
  unicodeKeyboard: true,
  resetKeyboard: true
};
var testText = 'é Œ ù ḍ';
driver
  .elementByClassName('android.widget.EditText')
  .sendKeys(testText)
  .text()
  .should.eventually.become(testText)
  .nodeify(done);
```
