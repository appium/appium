## 多语言支持

编程语言在处理非拉丁字符时候有一个问题，带重音符号的字符有多种编码方式。比如，
字母`é`，有两种编码：一个单字符`é`(Unicode的`LATIN SMALL LETTER E WITH ACUTE`
（带有尖标的小写拉丁字母E）)和字母`e`后跟上音标`́`的组合(`COMBINING ACUTE ACCENT`
（组合尖音标）)。为了解决这个问题，就有了`normalization(标准化)`，一种让["相同的字符串有一个唯一的二进制表示"](http://www.unicode.org/reports/tr15/)
的运算。

幸运的是，对ASCII文本（即不需要再被标准化的文本）进行标准化不会引起任何变化，且执行多次运算也不会有副作用。
因此，这个标准化函数在文本上调用不会有副作用的风险。

```javascript
// javascript
var unorm = require('unorm');

'some ASCII text' === unorm.nfd('some ASCII text');
unorm.nfd('Adélaïde Hervé') === unorm.nfd(unorm.nfd('Adélaïde Hervé'));
```

因此，当处理测试中的unicode文本时，你最好对预期的文本和从Appium接收到的文本都进行标准化。
进行标准化的方式有很多种，所以要确保对两边的字符串执行相同的运算！

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

问题的端倪是对编码后的unicode文本的断言失败但从报告上看，却是相同的字符串：

```shell
AssertionError: expected 'François Gérard' to deeply equal 'François Gérard'
      + expected - actual

      +"François Gérard"
      -"François Gérard"
```

由于问题仅仅是编码，输出 _看起来_ 一样。 标准化后，他们在程序里应该像看起来一样是相等的。


### 查找器(Finders)

通过文本查找时也可能需要标准化。举例来说，如果你在一个iOS应用里有一个名叫`Найти`的按钮，
你需要在查找命令里标准化文本。

```javascript
// javascript
var unorm = require('unorm');
driver
  .findElementByXPath(unorm.nfd("//UIAButton[@name='Найти']"))
    .should.eventually.exist;
```

否则这个元素会找不到。


### 文本框(Text Fields)

默认情况下，iOS和Android的自动化工具都不支持通过键盘向可编辑的区域输入non-ASCII字符。

#### iOS

Appium完全绕过键盘直接向iOS可编辑区域发送non-ASCII字符。虽然这样在测试中允许了文本的输入，但
必须记住的是任何通过键盘输入触发的业务逻辑都没有被测试到。

如上所述，接收到的文本在被断言前需要被标准化。

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

Android测试通过安装和使用一个[特殊键盘](https://github.com/appium/io.appium.android.ime)
来允许Unicode输入，它允许将文本像ASCII一样在Appium和被测应用间传递。

为了使用这个功能，将`unicodeKeyboard` desired capability设置为`true`。如果键盘需要被还原成初始状态，
将`resetKeyboard` desired capability也设置为`true`。不然设备上的Appium的Unicode键盘将会在测试完成后留用。

之后就可以通过使用`send_keys`向可编辑区域传递Unicode文本。

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
本文由 [NativeZhang](https://github.com/NativeZhang) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。