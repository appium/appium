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

#### 通过 `ajv` 实现单个参数的验证

当我们思考 JSON 模式时，通常会认为“我有一个 JSON 文件需要根据模式进行验证”。这种理解是正确的，实际上 Appium 在处理配置文件时正是这样做的！不过，Appium 在验证参数时采用了不同的方式。

!!! 注意

    在实现过程中，我曾试图将所有参数组合成一个类似配置文件的数据结构进行统一验证。虽然这在理论上是可行的，但由于 CLI 参数对象是扁平的键/值结构，而模式本身并非扁平结构，这种做法可能会引发问题。

Appium 实际采用的方式是：针对模式中特定的属性对参数值进行验证。为此，系统维护了 CLI 参数定义与对应模式属性之间的映射关系。这个映射关系通过一个 `Map` 实现，其中键是参数的唯一标识符，值是一个 `ArgSpec` 对象（定义于 `lib/schema/arg-spec.js`）。

`ArgSpec` 对象包含以下元数据：

| 属性名称        | 描述                                                                                     |
| --------------- | --------------------------------------------------------------------------------------- |
| `name`          | 参数的规范名称，对应模式中的属性名                                                      |
| `extType?`      | 扩展类型（`driver` 或 `plugin`），如果适用                                                |
| `extName?`      | 扩展名称，如果适用                                                                        |
| `ref`           | 模式中该属性的计算后 `$id` 引用                                                         |
| `arg`           | CLI 接受的参数名（不带前导短横线）                                                      |
| `dest`          | 解析后参数对象的属性名（由 `argparse` 的 `parse_args()` 返回）                          |
| `defaultValue?` | 模式中 `default` 关键字对应的值（如果存在）                                               |

当模式完成[最终化](#schema-finalization)时，该 `Map` 会被填充所有已知参数的 `ArgSpec` 对象。

在适配器为参数的 `type` 创建函数管道时，系统已经拥有该参数的 `ArgSpec`。它会创建一个调用 `validate(value, ref)` 的函数（位于 `lib/schema/schema.js`），其中 `value` 是用户提供的参数值，`ref` 是 `ArgSpec` 的 `ref` 属性。核心原理在于 `ajv` 可以使用任何已知的 `ref` 进行验证——无论该属性是否被显式定义，模式中的每个属性都可以通过其 `ref` 被引用。以下列模式为例：

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

其中 `foo` 的 `ref` 应为 `my-schema.json#/properties/foo`。假设我们的 `Ajv` 实例已注册该模式，即可通过 `getSchema(ref)` 方法（虽然名称有误，但其 `schema` 属性有效）获取验证函数；`schema.js` 中的 `validate(value, ref)` 方法正是调用此验证函数。

!!! 注意

    虽然模式规范允许通过显式声明 `$id` 来覆盖默认引用标识，但 Appium 目前不支持此特性。如有需要，扩展开发者必须谨慎使用不包含自定义 `$id` 的 `$ref` 引用。不过 Appium 自身的模式定义都未使用 `$ref`，可见扩展通常不需要如此复杂的模式结构。

接下来我们将探讨 Appium 如何加载模式。值得注意的是，模式加载过程实际上发生在参数验证之前。 

## 模式加载

让我们暂时忽略扩展功能，先从基础模式开始解析。

当首次导入 `lib/schema/schema.js` 模块时，系统会创建一个 `AppiumSchema` 实例。该实例为单例模式，其所有方法（均已绑定到实例）都通过该模块对外暴露。

构造函数仅执行基础操作：实例化一个 `Ajv` 验证器实例，并通过以下方式对其进行配置：添加 Appium 的[自定义关键字](#custom-keyword-reference);
通过 [ajv-formats](https://npm.im/ajv-formats) 模块启用 `format` 关键字支持。

在调用 `finalize()` 方法（导出为 `finalizeSchema()`）之前，`AppiumSchema` 实例不会与 `Ajv` 实例产生交互。此方法的调用标志着"模式定义阶段结束，将开始创建 `ArgSpec` 对象并向 `ajv` 注册最终模式"。

最终化触发的时机如下：

1. 当 `appium` 可执行文件启动时，首先在 `APPIUM_HOME` 目录中检查并配置扩展（此处简化处理）
2. 随后开始处理参数——实例化 `ArgParser`，该操作会运行适配器将模式转换为参数定义
3. 最终化在此处发生：创建解析器时，Appium 需要向 `ajv` 注册模式以生成参数验证函数
4. 通过 `ArgParser`完成参数解析
5. 最终根据解析结果决定后续操作流程

即使没有扩展功能，`finalize()` 仍会识别 Appium 的基础模式（`appium-config-schema.js`）并进行注册。不过上述步骤 1 实际涉及复杂的扩展处理机制，接下来我们将深入探讨扩展功能的影响。

## 扩展支持

本系统的设计目标之一是：

扩展应该能够向Appium注册自定义CLI参数，用户应该能够像使用其他参数一样使用它们。

此前，Appium 2通过`--driverArgs`方式接受参数，但验证过程需要手动实现，并要求扩展开发者使用自定义API。这种方式还要求用户在命令行中笨拙地传递JSON字符串作为配置。此外，这些参数没有上下文帮助信息（通过`--help`）。

现在，通过为选项提供模式（schema），驱动或插件可以向Appium注册CLI参数和配置文件模式。

要注册模式，扩展必须在其`package.json`中提供`appium.schema`属性。该值可以是模式本身或模式文件的路径。如果是路径，模式文件应为JSON或CommonJS模块（目前不支持ESM和YAML）。

对于该模式中的任何属性，都将以`--<扩展类型>-<扩展名称>-<属性名称>`的形式作为CLI参数出现。例如，如果`fake`驱动提供了`foo`属性，对应的参数将是`--driver-fake-foo`，并会像其他CLI参数一样显示在`appium server --help`中。

配置文件中对应的属性路径为`server.<扩展类型>.<扩展名称>.<属性名称>`，例如：

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

上述命名约定避免了不同扩展类型之间的名称冲突问题。

!!! 注意

    虽然扩展可以通过`appiumCliAliases`提供别名，但禁止使用"短"标志（short flags），因为所有扩展参数都带有`--<扩展类型>-<扩展名称>-`前缀。根据[Lodash的kebab-case规则](https://lodash.com/docs/4.17.15#kebabCase)，扩展名称和参数名称在CLI中将被转换为kebab-case格式。

模式对象的结构与Appium基础模式相似，但仅支持顶层属性（目前不支持嵌套属性）。示例：

```json
{
  "title": "为cowabunga驱动设计的超棒模式",
  "type": "object",
  "properties": {
    "fizz": {
      "type": "string",
      "default": "buzz",
      "$comment": "对应CLI参数--driver-cowabunga-fizz"
    }
  }
}
```

在用户的配置文件中，该属性将表示为`server.driver.cowabunga.fizz`。

当扩展被加载时，`schema`属性会被验证，并且模式会被注册到`AppiumSchema`中（在调用`finalize()`之前不会注册到`Ajv`）。

在最终化阶段，每个注册的模式都会被添加到`Ajv`实例中。模式会根据扩展类型和名称分配一个`$id`（这会覆盖扩展可能提供的任何现有ID）。模式还会通过`additionalProperties: false`强制禁止未知参数。

在底层实现中，基础模式包含`driver`和`plugin`属性（都是对象类型）。最终化时，会为每个属性添加对应扩展名称的子属性，其值是对扩展模式中`$id`的引用。例如，`server.driver`属性将如下所示：

```json
{
  "driver": {
    "cowabunga": {
      "$ref": "driver-cowabunga.json"
    }
  }
}
```

这就是为什么我们称之为“基础”模式——当扩展提供模式时，它会发生变化。扩展模式是分开保存的，但在最终将其添加到`ajv`之前，会将引用添加到模式中。这是有效的，因为`Ajv`实例能够理解已注册模式之间的相互引用。

!!! 注意

    这使得为Appium及其安装的扩展提供完整的静态模式变得不可能（截至2021年11月5日）。基础模式会通过Gulp任务生成静态`.json`模式文件，但不包含任何扩展模式。这种静态模式还有其他用途，例如IDE可以通过这种方式提供配置文件的上下文错误检查。这个问题需要后续解决？

与在基础模式中查找参数的引用ID方式相同，扩展参数的验证过程完全一致。如果`cowabunga`驱动的模式ID是`driver-cowabunga.json`，那么`fizz`属性可以通过`driver-cowabunga.json#/properties/fizz`路径在任意已注册模式中被引用。“基础”模式参数的引用路径则以`appium.json#properties/`开头。 

## 开发环境支持

在开发流程中，我们自动化了以下几个任务来维护基础模式：

- 作为后置转译步骤，会从 `lib/schema/appium-config-schema.js` 生成 `lib/appium-config.schema.json`（除了 Babel 生成的 CJS 对应文件外）
- 该文件受版本控制管理。在此步骤中会被复制到 `build/lib/appium-config.schema.json`
- 通过预提交钩子（参见 monorepo 根目录的 `scripts/generate-schema-declarations.js`）会从上述 JSON 文件生成 `types/appium-config-schema.d.ts`
- `types/types.d.ts` 中的类型定义依赖此文件，该文件受版本控制管理

## 自定义关键字参考

关键字定义于 `lib/schema/keywords.js`

- `appiumCliAliases`: 允许模式声明参数别名（例如 CLI 参数可以是 `--verbose` 或 `-v`）。值为字符串数组。短于三（3）个字符的字符串将使用单短横线（`-`）而非双短横线（`--`）开头。注意任何由扩展提供的参数都必须以双短横线开头，因为这些参数需要带有 `--<extension-type>-<extension-name>-` 前缀
- `appiumCliDest`: 允许模式指定 `argparse` 解析后参数对象中的自定义属性名。若未设置，将转换为驼峰式命名
- `appiumCliDescription`: 允许模式覆盖命令行显示的参数描述。与 `appiumCliTransformer`（或 `array`/`object` 类型属性）配合使用时非常有用，因为 CLI 用户可提供的内容与配置文件用户可提供的内容存在显著差异
- `appiumCliTransformer`: 目前支持 `csv` 和 `json` 两种选项。这些是用于后处理值的自定义函数。在加载和验证配置文件时不使用这些转换器，但核心思想是它们应该产生与使用配置文件相同的对象（例如字符串数组）。`csv` 用于逗号分隔字符串和 CSV 文件；`json` 用于原始 JSON 字符串和 `.json` 文件
- `appiumCliIgnore`: 若为 `true`，则不在 CLI 中支持该属性
- `appiumDeprecated`: 若为 `true`，该属性将被视为"已弃用"，并会向用户显示为弃用状态（例如在 `--help` 输出中）。注意 JSON Schema draft-2019-09 引入了新的 `deprecated` 关键字，如果我们升级到该元模式应该改用此关键字。迁移时，`appiumDeprecated` 本身应被标记为 `deprecated` 