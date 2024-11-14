---
title: Appium的配置系统
---

Appium2支持[配置文件](../guides/config.md)。配置文件是与命令行参数保持（几乎）一一对应的关系。
用户可以为Appium2提供配置文件、命令行参数，或者两者都提供（此时命令行参数的优先级高于配置文件）。

本文档将对配置系统的工作原理进行技术概述。它旨在为Appium的贡献者提供指导，但同时也会解释该系统的基础功能。

## 读取配置文件

配置文件是一个JSON、JavaScript或YAML文件，可以根据架构进行验证。
默认情况下，此文件将被命名为`.appiumrc.{json,js,yaml,yml}`，并位于依赖`appium`的项目的根目录中。
通过`--config <file>`标志，还支持其他文件名和位置。出于显而易见的原因，不允许在配置文件中使用`config`参数。

除了单独的文件外，配置还可以嵌入到项目的`package.json`文件中，使用`appiumConfig`属性。例如：

```json
{
  "appiumConfig": {
    "server": {
      "port": 12345
    }
  }
}
```

当通过`appium`可执行文件启动Appium服务器时，`lib/main.js`中的`init`函数将调用`lib/config-file.js`加载或搜索配置文件和`package.json`。

!!! 注意

    如果未找到配置文件，这并不会导致错误！

[`lilconfig`](https://npm.im/lilconfig)包提供了搜索和加载配置文件的功能；有关搜索路径的更多信息，请参考其文档。
此外，Appium通过[`yaml`](https://npm.im/yaml)包支持编写YAML格式的配置文件。

当找到并成功[验证](#_2)配置文件后，其结果将与默认设置以及额外的命令行参数进行合并。
在这个合并过程中，命令行参数的优先级高于配置文件，而配置文件的优先级则高于默认设置。

## 验证

该系统同时用于配置文件和命令行参数的验证。

[ajv](https://npm.im/ajv)包提供了验证功能。当然，为了让`ajv`进行验证，必须为其提供一个模式。

基础模式是一个符合[JSON Schema Draft-7](https://json-schema.org/draft/2020-12/json-schema-core.html)标准的对象，
由`lib/schema/appium-config-schema.js`文件导出。这个模式定义了Appium原生的配置，并且仅关注其作为服务器的行为；它并没有定义任何其他功能（例如插件或驱动程序子命令）的配置。

!!! 警告

    请注意，这个文件是基础模式文件；这一点在后续操作中会变得至关重要。

此文件不是JSON文件，因为（1）JSON对人类来说很难使用，（2）@jlipps特别讨厌它，（3）`ajv`接受对象，而不是JSON文件。

解释配置文件是如何被验证的会更加直接明了，所以我们从这里开始。

### 验证配置文件

当发现一个配置文件（`lib/config-file.js`），它会调用从`lib/schema/schema.js`导出的`validate`函数，并将配置文件的内容作为参数传递给该函数。
接着，validate函数会请求`ajv`根据Appium提供的模式来验证这些数据。

如果配置文件无效，ajv会生成错误，这些错误随后会被显示给用户。最后，`init`函数会检测到这些错误，将它们显示出来，并且整个进程会退出。

我希望已经解释清楚了，因为这部分相对来说是比较容易理解的。

### 验证CLI参数

正如之前提到的，相同的系统被用于验证配置文件和命令行参数。

这里并没有任何评判的意思，但Appium使用[`argparse`](https://npm.im/argparse)来解析命令行参数。
这个包以及其他类似的包提供了一个API，用于定义命令行Node.js脚本接受的参数，并最终返回一个表示用户提供的参数的对象。

就像模式定义了配置文件中允许的内容一样，它也定义了命令行上允许的内容。

#### 通过模式定义CLI参数

在验证命令行参数的值之前，必须先定义这些参数。

JSON模式并不是定义CLI参数的天然选择，它需要一些额外的处理才能使其适用，
但它已经足够接近，以至于我们可以通过一个适配器和一些自定义元数据来实现这一点。

在`lib/cli/parser.js`中，有一个围绕`argparse`库的`ArgumentParser`的包装器；它被称为`ArgParser`。
这个包装器存在是因为我们对`argparse`做了一些自定义处理，但它与模式本身没有直接关系。

创建一个`ArgParser`实例，并用原始的CLI参数调用了它的`parseArgs()`方法，在`lib/cli/args.js`里定义了可以接受的参数。
在这里，所有不打算与`server`子命令一起使用的参数都是硬编码的（例如，`driver`子命令及其子命令）。
`args.js`还包含一个`getServerArgs()`函数，该函数转而调用`lib/schema/cli-args.js`中的`toParserArgs`。
`lib/schema/cli-args.js`可以视为`argparse`和模式之间的“适配器”层。

`toParserArgs`使用了由`lib/schema/schema.js`导出的`flattenSchema`函数，该函数将模式“压平”为键值对表示。
然后，`toParserArgs`遍历每个键值对，并将其“转换”为适合最终传递给`ArgParser`的`ArgumentOption`对象。

这个适配器（`cli-args.js`）是隐藏大部分混乱的地方；让我们进一步探索这个错综复杂的环境。

##### CLI和模式不一致

转换算法（见`lib/schema/cli-args.js`中的`subSchemaToArgDef`函数）
主要就是将各种技巧和特殊情况巧妙地打包到一个函数中。
有些事情不能从`argparse`清晰地映射到JSON模式，包括但不限于：

- 模式不能原生的表达“将`--foo=<value>`的值存储在一个名为`bar`的属性中”（这对应于`ArgumentOption['dest']`属性）。
- 模式不能原生的表达别名，例如`--verbose`也可以是`-v`。
- 模式的枚举不限制于多种类型，但`argparse`中对应的`ArgumentOption['choices']`属性是限制的。
- 模式不知道`argparse`中的"动作"概念（注意Appium目前没有使用自定义动作——尽管它曾经使用过，并且可能再次使用）。
- `argparse`没有原生的`email`、`hostname`、`ipv4`、`uri`等类型，而模式有。
- 模式验证只进行验证，不执行翻译、转换或强制转换（大部分情况下），`argparse`允许这样做。
- 出于某种原因模式允许`null`类型，你曾在命令行上传递过`null`吗？
- `argparse`除了基本类型之外，不理解其他任何内容，不理解对象、数组等，当然也不理解特定类型的数组。
- 
上述所有情况以及其他情况均由适配器处理。

!!! 警告

    适配器中的一些决策是通过抛硬币决定的。如果你好奇为什么某些事情会是这样，那很可能是因为它不得不这样做。

让我们更仔细地看看类型的处理。

#### 通过`ajv`处理参数类型

虽然`argparse`允许使用者通过API定义各种参数的类型（例如，字符串、数字、布尔标志等），
但Appium大多避免使用这些内置类型。为什么会这样呢？原因如下：

1. 我们已经知道参数的类型，因为我们在模式中已经定义了它。
2. `ajv`提供了针对模式的验证。
3. 模式允许对类型、允许的值等进行更丰富的表达，这些是`argparse`原生无法提供的。
4. 模式的表达能力允许提供更好的错误消息。

因此，适配器避开了`argparse`的内置类型（参见`ArgumentOption['type']`允许的字符串值），
而是滥用将函数作为类型提供的能力。例外情况是布尔标志，它们没有`type`，而是有`action: 'store_true'`。
至于为什么会这样，可能永远没人知道。

##### 类型作为函数

当`type`是一个函数时，这个函数同时执行验证和强制转换（如果需要）。那么这些函数是什么呢？

> 注意：如果属性类型是布尔值，那么`ArgumentOption`中的`type`会被省略（因此不是一个函数），
> 但会提供了一个`action`属性，值为`store_true`。是的，这很奇怪。我不知道为什么。

这取决于模式。但一般来说，我们会创建一个函数管道，每个函数都对应于模式中的一个关键字。
让我们以`port`参数为例，与其询问操作系统Appium运行的用户可以绑定到哪些端口，
不如预期这个参数是一个介于1和65535之间的整数。
这实际上是由两个函数组成的管道，我们将它们组合在一起：

1. 如果可能，将值转换为整数。因为`process.argv`中的每个值都是字符串，所以如果我们想要一个数字，就必须进行转换。
2. 使用`ajv`根据端口的模式验证整数。模式允许我们通过`minimum`和`maximum`关键字定义范围。有关其工作原理的更多信息，请查阅相关文档。

就像配置文件验证一样，如果检测到错误，Appium会友好地告诉用户，并附带一些帮助文本然后退出进程。

对于其他本身就是非基本类型的参数，事情就没那么简单了。

##### 转换器

还记得`argparse`无法理解数组吗？但如果表达一个值最直观的方式实际上是一个数组怎么办？

虽然Appium可以在配置文件中接受数组，但在命令行界面上却不能。
Appium可以接受一个逗号分隔的字符串（CSV行），或者是一个字符串文件路径，
指向包含分隔列表的文件。无论哪种方式，当值从参数解析器中输出时，它都应该是一个数组。

如上所述，JSON模式的原生功能无法表达这一点。然而可以定义一个自定义关键字，
Appium可以检测并相应地处理它，这就是Appium所做的。

在这种情况下，使用`ajv`注册了一个自定义关键字`appiumCliTransformer`。
在编写本文时，`appiumCliTransformer`的值可以是`csv`或`json`。
在基础模式文件`appium-config-schema.js`中，如果希望这种行为发生，
Appium会使用`appiumCliTransformer: 'csv'`。

!!! 注意

    在模式中定义的任何类型为数组的属性都会自动使用csv转换器。同样，类型为对象的属性将使用json转换器。
    可以想象，某些情况下数组可能想要使用JSON转换器，但除此之外，
    在类型为数组或对象的属性上使用`appiumCliTransformer`关键字并不是严格必要的。
    
适配器（还记得适配器吗？）创建了一个管道函数，其中包括一个特殊的“CSV转换器”，转换器在`lib/schema/cli-transwers.js`中定义，
并将此函数作为值传递给`argparse`的`ArgumentOption`的`type`属性，在这种情况下，模式中的`type: 'array'`将被忽略。

!!! 注意

    配置文件不需要执行任何复杂的值转换，因为它自然允许Appium准确定义它所期望的内容。
    因此Appium不会对配置文件值进行后期处理。

不需要这种特殊处理的属性直接使用`ajv`进行验证。这是如何工作的一些解释，所以接下来就是这样。

#### Validation of Individual Arguments via `ajv`

When we think of a JSON schema, we tend to think, "I have this JSON file and I want to validate it
against the schema". That's valid, and in fact Appium does just that with config files! However,
Appium does not do this when validating arguments.

!!! 注意

    During implementation, I was tempted to mash all of the arguments together into
    a config-file-like data structure and then validate it all at once. I think that would have
    been _possible_, but since an object full of CLI arguments is a flat key/value structure and
    the schema is not, this seemed like trouble.

Instead, Appium validates a value against a specific property _within_ the schema. To do this, it
maintains a mapping between a CLI argument definition and its corresponding property. The mapping
itself is a `Map` with a unique identifier for the argument as the key, and an `ArgSpec`
(`lib/schema/arg-spec.js`) object as the value.

An `ArgSpec` object stores the following metadata:

| Property Name   | Description                                                                           |
| --------------- | ------------------------------------------------------------------------------------- |
| `name`          | Canonical name of the argument, corresponding to the property name in the schema.     |
| `extType?`      | `driver` or `plugin`, if appropriate                                                  |
| `extName?`      | Extension name, if appropriate                                                        |
| `ref`           | Computed `$id` of the property in the schema                                          |
| `arg`           | Argument as accepted on CLI, without leading dashes                                   |
| `dest`          | Property name in parsed arguments object (as returned by `argparse`'s `parse_args()`) |
| `defaultValue?` | Value of the `default` keyword in schema, if appropriate                              |

When a schema is [finalized](#schema-finalization), the `Map` is populated with `ArgSpec` objects
for all known arguments.

So when the adapter is creating the pipeline of functions for the argument's `type`, it already has
an `ArgSpec` for the argument. It creates a function which calls `validate(value, ref)` (in
`lib/schema/schema.js`) where `value` is whatever the user provided, and `ref` is the `ref`
property of the `ArgSpec`. The concept is that `ajv` can validate using _any_ `ref` it knows about;
each property in a schema can be referenced by this `ref` whether it's defined or not. To help
visualize, if a schema is:

```json
{
  "$id": "my-schema.json",
  "type": "object",
  "properties": {
    "foo": {
      "type": "number"
    }
  }
}
```

The `ref` of `foo` would be `my-schema.json#/properties/foo`. Assuming our `Ajv` instance knows
about this `my-schema.json`, then we can call its `getSchema(ref)` method (which has a `schema`
property, but is a misnomer nonetheless) to get a validation function; `validate(value, ref)` in
`schema.js` calls this validation function.

!!! 注意

    The schema spec says a schema author can supply an explicit `$id` keyword to override this;
    it's unsupported by Appium at this time. If needed, extension authors must carefully use `$ref`
    without custom `$id`s. It's highly unlikely an extension would have a schema so complicated as
    to need this, however; Appium itself doesn't even use `$ref` to define its own properties!

Next, let's take a look at how Appium loads schemas. This actually happens _before_ any argument
validation.

## Schema Loading

Let's ignore extensions for a moment, and start with the base schema.

When something first imports the `lib/schema/schema.js` module, an instance of an `AppiumSchema` is
created. This is a singleton, and its methods are exported from the module (all of which are bound
to the instance).

The constructor does very little; it instantiates an `Ajv` instance and configures it with Appium's
[custom keywords](#custom-keyword-reference) and adds support for the `format` keyword via the
[ajv-formats](https://npm.im/ajv-formats) module.

Otherwise, the `AppiumSchema` instance does not interact with the `Ajv` instance until its
`finalize()` method (exported as `finalizeSchema()`) is called. When this method is called, we're
saying "we are not going to add any more schemas; go ahead and create `ArgSpec` objects and
register schemas with `ajv`".

When does finalization happen? Well:

1. When the `appium` executable begins, it _checks for and configures extensions_ (hand-wave) in `APPIUM_HOME`.
2. Only then does it start to think about arguments--it instantiates an `ArgParser`, which (as you'll recall) runs the adapter to convert the schema to arguments.
3. _Finalization happens here_--when creating the parser. Appium need the schema(s) to be registered with `ajv` in order to create validation functions for arguments.
4. Thereafter, Appium parses the arguments with the `ArgParser`.
5. Finally, decides what to do with the returned object.

Without extensions, `finalize()` still knows about the Appium base schema
(`appium-config-schema.js`), and just registers that. However, step 1. above is doing a _lot of
work_, so let's look at how extensions come into play.

## Extension Support

One of the design goals of this system is the following:

_An extension should be able to register custom CLI arguments with the Appium, and a user should be
able to use them like any other argument_.

Previously, Appium 2 accepted arguments in this manner (via `--driverArgs`), but validation was
hand-rolled and required extension implementors to use a custom API. It also required the user to
awkwardly pass a JSON string as the configuration on the command-line. Further, no contextual help
(via `--help`) existed for these arguments.

Now, by providing a schema for its options, a driver or plugin can register CLI arguments and
config file schemas with Appium.

To register a schema, an extension must provide the `appium.schema` property in its `package.json`.
The value may be a schema or a path to a schema. If the latter, the schema should be JSON or
a CommonJS module (ESM not supported at this time, nor is YAML).

For any property in this schema, the property will appear as a CLI argument of the form
`--<extension-type>-<extension-name>-<property-name>`. For example, if the `fake` driver provides
a property `foo`, the argument will be `--driver-fake-foo`, and will show in `appium server --help`
like any other CLI argument.

The corresponding property in a config file would be
`server.<extension-type>.<extension-name>.<property-name>`, e.g.:

```json
{
  "server": {
    "driver": {
      "fake": {
        "foo": "bar"
      }
    }
  }
}
```

The naming convention described above avoids problems of one extension type having a name conflict
with a different extension type.

!!! 注意

    While an extension can provide aliases via `appiumCliAliases`, "short" flags are disallowed,
    since all arguments from extensions are prefixed with `--<extension-type>-<extension-name>-`.
    The extension name and argument name will be kebab-cased for the CLI, according to [Lodash's
    rules](https://lodash.com/docs/4.17.15#kebabCase) around kebab-casing.

The schema object will look much like Appium's base schema, but it will only have top-level
properties (nested properties are currently unsupported). Example:

```json
{
  "title": "my rad schema for the cowabunga driver",
  "type": "object",
  "properties": {
    "fizz": {
      "type": "string",
      "default": "buzz",
      "$comment": "corresponds to CLI --driver-cowabunga-fizz"
    }
  }
}
```

As written in a user's config file, this would be the `server.driver.cowabunga.fizz` property.

When extensions are loaded, the `schema` property is verified and the schema is registered with the
`AppiumSchema` (it is _not_ registered with `Ajv` until `finalize()` is called).

During finalization, each registered schema is added to the `Ajv` instance. The schema is assigned
an `$id` based on the extension type and name (which overrides whatever the extension provides, if
anything). Schemas are also forced to disallowed unknown arguments via the `additionalProperties:
false` keyword.

Behind the scenes, the base schema has `driver` and `plugin` properties which are objects. When
finalized, a property is added to each--corresponding to an extension name--and the value of this
property is a reference to the `$id` of a property in the extension schema. For example, the
`server.driver` property will look like this:

```json
{
  "driver": {
    "cowabunga": {
      "$ref": "driver-cowabunga.json"
    }
  }
}
```

This is why we call it the "base" schema--it is _mutated_ when extensions provide schemas. The
extension schemas are kept separately, but the _references_ are added to the schema before it's
ultimately added to `ajv`. This works because an `Ajv` instance understands references _from_ any
schema it knows about _to_ any schema it knows about.

!!! 注意

    This makes it impossible to provide a complete static schema for Appium _and_ the installed
    extensions (as of Nov 5 2021). A static `.json` schema _is_ generated from the base (via a Gulp
    task), but it does not contain any extension schemas. The static schema also has uses beyond
    Appium; e.g., IDEs can provide contextual error-checking of config files this way. Let's solve
    this?

Just like how we look up the reference ID of a particular argument in the base schema, validation
of arguments from extensions happens the exact same way. If the `cowabunga` driver has the schema
ID `driver-cowabunga.json`, then the `fizz` property can be referenced from any schema registered
with `ajv` via `driver-cowabunga.json#/properties/fizz`. "Base" schema arguments begin with
`appium.json#properties/` instead.

## Development Environment Support

During the flow of development, a couple extra tasks have been automated to maintain the base
schema:

- As a post-transpilation step, a `lib/appium-config.schema.json` gets generated from
- `lib/schema/appium-config-schema.js` (in addition to its CJS counterpart generated by Babel).
- This file is under version control. It ends up being _copied_ to
- `build/lib/appium-config.schema.json` in this step. A pre-commit hook (see
- `scripts/generate-schema-declarations.js` in the root monorepo) generates
- a `types/appium-config-schema.d.ts` from the above JSON file. The types in `types/types.d.ts`
- depend upon this file. This file is under version control.

## Custom Keyword Reference

Keywords are defined in `lib/schema/keywords.js`.

- `appiumCliAliases`: allows a schema to express aliases (e.g., a CLI argument can be `--verbose` or `-v`). This is an array of strings. Strings shorter than three (3) characters will begin with a single dash (`-`) instead of a double-dash (`--`). Note that any argument provided by an extension will begin with a double-dash, because these are required to have the `--<extension-type>-<extension-name>-` prefix.
- `appiumCliDest`: allows a schema to specify a custom property name in the post-`argprase` arguments objects. If not set, this becomes a camelCased string.
- `appiumCliDescription`: allows a schema to override the description of the argument when displayed on the command-line. This is useful paired with `appiumCliTransformer` (or `array`/`object`-typed properties), since there's a substantial difference between what a CLI-using user can provide vs. what a config-file-using user can provide.
- `appiumCliTransformer`: currently a choice between `csv` and `json`. These are custom functions which post-process a value. They are not used when loading & validating config files, but the idea should be that they result in the same object you'd get if you used whatever the config file wanted (e.g., an array of strings). `csv` is for comma-delimited strings and CSV files; `json` is for raw JSON strings and `.json` files.
- `appiumCliIgnore`: If `true`, do not support this property on the CLI.
- `appiumDeprecated`: If `true`, the property is considered "deprecated", and will be displayed as such to the user (e.g., in the `--help` output). Note the JSON Schema draft-2019-09 introduces a new keyword `deprecated` which we should use instead if upgrading to this metaschema. When doing so, `appiumDeprecated` should itself be marked as `deprecated`.
