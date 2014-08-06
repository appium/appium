## Multi-lingual Support

By default the automation tools for both iOS and Android do not support non-ASCII
characters sent to editable fields through the keyboard.

### iOS

Appium sends non-ASCII characters to iOS editable fields directly, bypassing the
keyboard altogether. While this allows the text to be inputted in tests, it should
be kept in mind that any business logic triggered by keyboard input will therefore
not be tested.

One main caveat to this behavior is the encoding of the strings sent and received.
Unicode also has the concept of “combining characters”, which are diacritical
modifications of other characters. Rather than a single character representing
what is seen, two (or more, in the case of heavily accented characters) separate
characters are sometimes used to represent one, with the system overlaying them.

Thus, while in Unicode the letter `é` (Unicode's "LATIN SMALL LETTER E WITH ACUTE")
can be encoded as a single letter, the iOS simulator will return the equally
valid representation of the letter `e` followed by the accent, `́` ("COMBINING
ACUTE ACCENT"). When this occurs a test may be reported but the expected
and actual results will look exactly the same. The solution to this is to
[normalize](http://www.unicode.org/faq/normalization.html) the text before asserting
on it.

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

### Android

Android tests allow for Unicode input by installing and using a [specialized
keyboard](https://github.com/appium/io.appium.android.ime) that allows the text
to be passed as ASCII text between Appium and the application being tested.

In order to utilize this functionality, set the `unicodeKeyboard` desired capability
is set to `true`. If the keyboard should be returned to its original state, the
`resetKeyboard` desired capability should also be set to `true`. Otherwise Appium's
Unicode keyboard will remain enabled on the device after the tests are completed.

Then tests can pass Unicode text to editable fields using `send_keys`.

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
