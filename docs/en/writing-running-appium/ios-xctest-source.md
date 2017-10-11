## Getting Page Source For iOS With WebDriverAgent/XCTest Backend

WebDriverAgent provides a possibility to represent page source in different formats. Usually it is enough to call _getPageSource_ driver method, which is the standard one and is available for all the client libraries. This method returns the hierarchical representation of the current UI source represented as XML document. However, sometimes it is convenient to get page representation in JSON format or some other format, which is supported by WDA/XCTest. Also, the actual performance of different page representation providers is different and the default method is not always necessarily the most performant one.


### mobile: source

This endpoint allows to retrieve the current native page source from WDA as a string even being in the web context.

#### Supported arguments

 * _format_: The name of the format to represent the UI source in. Possible values are: _xml_,  _json_ and _description_. The same output as for _getPageSource_ source will be generated in case this argument is omitted.

#### Usage examples

```java
// Java
JavascriptExecutor js = (JavascriptExecutor) driver;
Map<String, Object> args = new HashMap<>();
args.put("format", "json");
JSONObject source = new JSONObject(js.executeScript("mobile: source", args));
```
