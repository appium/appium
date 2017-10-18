## Multi-lingual Support

One problem with dealing with non-Latin characters programmatically is that, for characters
with accents, there can be multiple ways of encoding the form. So, for the letter
`é`, there are two encodings: a single combining character `é` (Unicode's
`LATIN SMALL LETTER E WITH ACUTE`), and the combination of the letter `e` followed
by the accent, `́` (`COMBINING ACUTE ACCENT`). In order to deal with this, there
is `normalization`, an operation that makes ["equivalent strings have a unique
binary representation"](http://www.unicode.org/reports/tr15/).

Luckily, normalizing ASCII text (i.e., text that doesn't need to be normalized)
does not cause any changes, and performing
the operation multiple times does not have an effect. Thus a normalization
function can be called on text without risking adverse effects.

```javascript
// javascript
var unorm = require('unorm');

'some ASCII text' === unorm.nfd('some ASCII text');
unorm.nfd('Adélaïde Hervé') === unorm.nfd(unorm.nfd('Adélaïde Hervé'));
```

So, when dealing with unicode text within a test, you need to normalize, preferably
on both the text expected and that received from Appium. There are a number of
ways to do the normalization, so be sure to perform the same operation on both
strings!

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

One tell-tale sign that the problem is with the encoding of the unicode text is
an assertion that fails but reports what look to be the same string:

```shell
AssertionError: expected 'François Gérard' to deeply equal 'François Gérard'
      + expected - actual

      +"François Gérard"
      -"François Gérard"
```

Since the error is just encoding, the output _looks_ the same. Normalized, these
should equal programmatically as well as visually.


### Finders

Finding by text can also require normalization. For instance, if you have a button
in an iOS app with the name `Найти` you may need to normalize the text within the
find command.

```javascript
// javascript
var unorm = require('unorm');
driver
  .findElementByXPath(unorm.nfd("//UIAButton[@name='Найти']"))
    .should.eventually.exist;
```

Otherwise the elements may not be found.


### Text Fields

By default the automation tools for both iOS and Android do not support non-ASCII
characters sent to editable fields through the keyboard.

#### iOS

Appium sends non-ASCII characters to iOS editable fields directly, bypassing the
keyboard altogether. While this allows the text to be inputted in tests, it should
be kept in mind that any business logic triggered by keyboard input will therefore
not be tested.

As above, the text received may need to be normalized before asserting on it.

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
