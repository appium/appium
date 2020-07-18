## Automating Simulator Pasteboard Actions For iOS With WebDriverAgent/XCTest Backend

There is a possibility in Appium to set the content of the iOS Simulator pasteboard
and read the content from there if needed. Each Simulator maintains its own pasteboard.
This feature is only available since Xcode SDK 8.1.
Unfortunately, real devices don't provide such features.

### mobile: setPasteboard

This command sets the content of Simulator's pasteboard to the particular string
provided as an argument. Also, it is possible to customize the encoding of the given
string.

#### Supported arguments

 * _content_: The content of the pasteboard. The previous content is going
 to be overridden. The parameter is mandatory
 * _encoding_: Encoding of the given content. UTF-8 by default.

#### Usage examples

```java
// Java
JavascriptExecutor js = (JavascriptExecutor) driver;
Map<String, Object> args = new HashMap<>();
args.put("content", new String(Files.readAllBytes(new File("/etc/passwd").toPath()), Charset.forName("latin-1")));
js.executeScript("mobile: setPasteboard", args);
```


### mobile: getPasteboard

This command is used to get the current content of Simulator's pasteboard as
a string. Also, it is possible to customize the encoding of the received
string.

#### Supported arguments

 * _encoding_: Encoding of the received pasteboard content. UTF-8 by default.

#### Usage examples

```python
# Python
content = driver.execute_script('mobile: getPasteboard', {'encoding': 'shift-jis'});
```
