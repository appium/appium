# {{name}}

{{short_description}}
## Example Usage

```java
// Java
{{example_usage.java}}
```
```python
# Python
{{example_usage.python}}
```
```javascript
// Javascript
// webdriver.io example
{{example_usage.javascript_wdio}}

// wd example
{{example_usage.javascript_wd}}
```
```ruby
# Ruby
{{example_usage.ruby}}
```
```php
# PHP
{{example_usage.php}}
```
```csharp
// C#
{{example_usage.csharp}}
```

## Description

{{description}}

## Client Docs

* [Java]({{client_docs.java}})
* [Python]({{client_docs.python}})
* [Javascript (WebdriverIO)]({{client_docs.javascript_wdio}})
* [Javascript (WD)]({{client_docs.javascript_wd}})
* [Ruby]({{client_docs.ruby}})
* [PHP]({{client_docs.php}})
* [C#]({{client_docs.csharp}})

## Support

### Appium Server

|Platform|Driver|Platform Versions|Appium Version|Driver Version|
|--------|----------------|------|--------------|--------------|
{{#each driver_support.ios}}
| {{#if @first}}iOS{{/if}} | [{{capitalize @key}}](/docs/en/drivers/ios-{{@key}}.md) | {{versions this "platform" @key}} | {{versions this "appium" @key}} | {{versions this "driver" @key}} |
{{/each}}
{{#each driver_support.android}}
| {{#if @first}}Android{{/if}} | [{{capitalize @key}}](/docs/en/drivers/android-{{@key}}.md) | {{versions this "platform" @key}} | {{versions this "appium" @key}} | {{versions this "driver" @key}} |
{{/each}}
{{#each driver_support.mac}}
| {{#if @first}}Mac{{/if}} | [{{capitalize @key}}](/docs/en/drivers/{{@key}}.md) | {{versions this "platform" @key}} | {{versions this "appium" @key}} | {{versions this "driver" @key}} |
{{/each}}
{{#each driver_support.windows}}
| {{#if @first}}Windows{{/if}} | [{{capitalize @key}}](/docs/en/drivers/{{@key}}.md) | {{versions this "platform" @key}} | {{versions this "appium" @key}} | {{versions this "driver" @key}} |
{{/each}}

### Appium Clients 

|Language|Support|
|--------|-------|
|[Java](https://github.com/appium/java-client/releases/latest)| {{versions client_support.java}} |
|[Python](https://github.com/appium/python-client/releases/latest)| {{versions client_support.python}} |
|[Javascript (WebdriverIO)](http://webdriver.io/index.html)| {{versions client_support.javascript_wdio}} |
|[Javascript (WD)](https://github.com/admc/wd/releases/latest)| {{versions client_support.javascript_wd}} |
|[Ruby](https://github.com/appium/ruby_lib/releases/latest)| {{versions client_support.ruby}} |
|[PHP](https://github.com/appium/php-client/releases/latest)| {{versions client_support.php}} |
|[C#](https://github.com/appium/appium-dotnet-driver/releases/latest)| {{versions client_support.csharp}} |

## HTTP API Specifications

### Endpoint

`{{uppercase endpoint.method}} {{endpoint.url}}`

### URL Parameters

|name|description|
|----|-----------|
{{#each endpoint.url_parameters}}
|{{this.name}}|{{this.description}}|
{{/each}}


### JSON Parameters

{{#if endpoint.json_parameters}}
|name|type|description|
|----|-----------|
{{#each endpoint.json_parameters}}
| {{this.name}} | {{this.type}} | {{this.description}} |
{{/each}}

{{else}}
None
{{/if}}

### Response

{{#if endpoint.response}}
|name|type|description|
|----|----|-----------|
{{#each endpoint.response}}
| {{this.name}} | {{this.type}} | {{this.description}} |
{{/each}}
{{else}}
null
{{/if}}

## See Also

{{#if specifications.w3c}}
* [W3C Specification]({{specifications.w3c}})
{{/if}}
{{#if specifications.jsonwp}}
* [JSONWP Specification]({{specifications.jsonwp}})
{{/if}}
{{#each links}}
* [{{this.name}}]({{this.url}})
{{/each}}
