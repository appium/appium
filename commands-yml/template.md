# {{name}}

{{short_description}}
## Example Usage

```java
{{#if example_usage.java}}
// Java
{{example_usage.java}}
{{else}}
// Not supported
{{/if}}
```

```python
{{#if example_usage.python}}
# Python
{{example_usage.python}}
{{else}}
# Not supported
{{/if}}
```

```javascript
{{#if example_usage.javascript_wdio}}
// Javascript
// webdriver.io example
{{example_usage.javascript_wdio}}

// wd example
{{example_usage.javascript_wd}}
{{else}}
// Not supported
{{/if}}
```

```ruby
{{#if example_usage.ruby}}
# Ruby
{{example_usage.ruby}}
{{else}}
# Not supported
{{/if}}
```

```php
{{#if example_usage.php}}
# PHP
{{example_usage.php}}
{{else}}
// Not supported
{{/if}}
```

```csharp
{{#if example_usage.csharp}}
// C#
{{example_usage.csharp}}
{{else}}
// Not supported
{{/if}}
```

{{#if selector_strategies}}
## Selector Strategies
|Strategy|Description|
|--------|-----------|
{{#each selector_strategies}}
|{{this.name}}|{{this.description}}|
{{/each}}
|@key|
{{/if}}

{{#if description}}
## Description

{{description}}
{{/if}}

## Client Docs

{{#if client_docs.java}} * [Java]({{client_docs.java}}) {{/if}}
{{#if client_docs.python}} * [Python]({{client_docs.python}}) {{/if}}
{{#if client_docs.javascript_wdio}} * [Javascript (WebdriverIO)]({{client_docs.javascript_wdio}}) {{/if}}
{{#if client_docs.javascript_wd}} * [Javascript (WD)]({{client_docs.javascript_wd}}) {{/if}}
{{#if client_docs.ruby}} * [Ruby]({{client_docs.ruby}}) {{/if}}
{{#if client_docs.php}} * [PHP]({{client_docs.php}}) {{/if}}
{{#if client_docs.csharp}} * [C#]({{client_docs.csharp}}) {{/if}}

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

{{#if endpoint.url_parameters}}
|name|description|
|----|-----------|
{{#each endpoint.url_parameters}}
|{{this.name}}|{{this.description}}|
{{/each}}
{{else}}
None
{{/if}}

### JSON Parameters

{{#if endpoint.json_parameters}}
|name|type|description|
|----|-----------|
{{#each endpoint.json_parameters}}
<<<<<<< HEAD
| {{this.name}} | `{{this.type}}` | {{this.description}} |
=======
| {{{this.name}}} | {{{this.type}}} | {{{this.description}}} |
>>>>>>> Add more commands documentation
{{/each}}
{{else}}
None
{{/if}}

### Response

{{#if endpoint.response}}
{{#if_eq endpoint.response.length 1}}
{{endpoint.response.0.description}} (`{{endpoint.response.0.type}}`)
{{else}}
|name|type|description|
|----|----|-----------|
{{#each endpoint.response}}
| {{this.name}} | `{{this.type}}` | {{this.description}} |
{{/each}}
{{/if_eq}}
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
