---
title: Appium 的配置系统
---

Appium 支持[配置文件](../guides/config.md)。配置文件的目标是与命令行参数做到（近乎）1:1 对应。最终用户可以为 Appium 提供配置文件、CLI 参数，或两者同时提供（参数优先级高于配置文件）。

本文是配置系统工作原理的技术性概览。它面向 Appium 贡献者，但也会说明该系统的基本特性。

## 读取配置文件

配置文件是一个可以按 schema 校验的 JSON、JavaScript 或 YAML 文件。默认情况下，该文件名为
`.appiumrc.{json,js,yaml,yml}`，应放在依赖 `appium` 的那个项目的根目录中。其他文件名和位置也支持，需通过 `--config <file>` 标志指定。显而易见，配置文件内部不允许出现 `config` 参数。

除了独立文件之外，还可以把配置内嵌在项目的 `package.json` 中，使用 `appiumConfig` 属性，例如：

```json
{
  "appiumConfig": {
    "server": {
      "port": 12345
    }
  }
}
```

当通过 `appium` 可执行文件启动 Appium 服务器时，`lib/main.js` 中的 `init` 函数会调用`lib/bootstrap/config-file.js`，去加载和/或查找配置文件以及 `package.json` 中的配置。

!!! 注意

```
没有找到配置信息并不是错误！
```

[`lilconfig`](https://npm.im/lilconfig) 包提供了查找与加载功能；关于搜索路径的更多信息请参考它的文档。此外，Appium 通过 [`yaml`](https://npm.im/yaml) 包支持用 YAML 编写的配置文件。

如果找到配置文件并成功[通过校验](#校验)，其结果会与一组默认值以及额外的 CLI 参数合并。 CLI 参数的优先级高于配置文件，配置文件的优先级高于默认值。

## 校验

用于校验配置文件和命令行参数的是同一套系统。

校验由 [`ajv`](https://npm.im/ajv) 包提供。当然，要让 `ajv` 校验任何东西，必须先给它一个 _schema_。

_基础_ schema 是由 `lib/schema/appium-config-schema.js` 导出的一个符合 [JSON Schema Draft-7](https://json-schema.org/draft/2020-12/json-schema-core.html) 的对象。该 schema 定义的是 _Appium 原生&#x7684;_&#x914D;置，并且只涉及它作&#x4E3A;_&#x670D;务&#x5668;_&#x7684;行为；它不定义其他任何功能（例如 `plugin` 或 `driver` 子命令）的配置。

!!! 警告

```
请注意这个文件只是基础 schema；这一点后面会体现得很"刻骨铭心"。
```

这个文&#x4EF6;_&#x4E0D;是_ JSON 文件，因为 a) JSON 对人来说很难编写，b) 它尤其让 @jlipps 讨厌，c) `ajv`接受的是对象而不是 JSON 文件。

解释配置文件的校验流程更直接一些，所以我们从那里开始。

### 校验配置文件

当找到配置文件后（`lib/bootstrap/config-file.js`），它会把配置文件的内容传给 `lib/schema/schema.js` 导出的 `validate` 函数。这一步请求 `ajv` 按 Appium 提供的 schema 来校验数据。

如果配置文件非法，就会生成用于展示给用户的错误。最终 `init` 函数会检测到这些错误并把它们显示出来，随后进程退出。

我希望这段讲清楚了，因为这只是简单的部分。

### 校验命令行参数

如前所述，校验配置文件和校验 CLI 参数用的是同一套系统。

无意评判谁，Appium 用 [`argparse`](https://npm.im/argparse) 解析命令行参数。这类包提供了一套API 来定义一个命令行 Node.js 脚本可接受的参数，并最终返回用户所给参数的对象表示。

正如 schema 定义了配置文件中允许出现什么，它也定义了命令行上允许出现什么。

#### 通过 schema 定义 CLI 参数

必须&#x5148;_&#x5B9A;义_ CLI 参数，才能校验它们的值。

JSON schema 并不是天然适合定义 CLI 参数的格式——得加点"润滑油"才能跑得起来——不过它足够接近，我们借助一个适配层和一些自定义元数据就能做到。

在 `lib/cli/parser.js` 中有一个对 `argparse` 的 `ArgumentParser` 的包装类；它叫.. `ArgParser`。之所以有这个包装，是因为我们对 `argparse` 做了一些自定义处理，但它与 schema 本身
没有直接关系。

系统会创建一个 `ArgParser` 实例，并用原始的 CLI 参数调用它的 `parseArgs()` 方法。可接受参数的定义有一部分来自 `lib/cli/args.js`——在那里，所&#x6709;_&#x4E0D;_&#x7528;于 `server` 子命令的参数都是硬编码的（例如 `driver` 子命令以&#x53CA;_&#x5B83;_&#x7684;子命令）。 `args.js` 还包含一个 `getServerArgs()` 函数，它会调用 `lib/schema/cli-args.js` 中的 `toParserArgs`。 `lib/schema/cli-args.js` 可以被视为 `argparse` 与 schema 之间的"适配层"。

`toParserArgs` 使用 `lib/schema/schema.js` 导出的 `flattenSchema` 函数，该函数会把 schema
"压扁"成键/值表示。然后 `toParserArgs` 遍历每一对键/值，把它"转换"成合适的 `ArgumentOption` 对象，最终交给 `ArgParser`。

这个适配层（`cli-args.js`）正是藏污纳垢之处；我们再来翻翻这个老鼠窝。

##### CLI 与 schema 的不一致之处

转换算法（见 `lib/schema/cli-args.js` 中的 `subSchemaToArgDef` 函数）大体上就是把各种 hack 和
特例整齐地塞进一个函数里。无法从 `argparse` 干净地映射到 JSON schema 的事情包括但不限于：

- Schema 无法原生表达"把 `--foo=<value>` 的值存到一个名为 `bar` 的属性里"（对应 `ArgumentOption['dest']` 属性）。
- Schema 无法原生表达别名；例如 `--verbose` 也可以写成 `-v`
- Schema 的 `enum` 不限于同一种类型，而 `argparse` 中对应的 `ArgumentOption['choices']` 属&#x6027;_&#x5374;_&#x6709;这个限制
- Schema 不知道 `argparse` 的"actions"概念（注意 Appium 目前并未使用自定义 action——尽管它曾经用过，将来也可能再用）。
- `argparse` 没有 `email`、`hostname`、`ipv4`、`uri` 等原生类型，而 schema 有
- Schema 校验只&#x505A;_&#x6821;验_，不做翻译、转换或类型强制转换。而 `argparse` 允许这些。
- Schema 允许 `null` 类型，天知道为什么。你在命令行上传过 `null` 吗？
- `argparse` 只理解原始类型；不理解对象、数组等，更不理解"某种特定类型的数组"。

以上所有这些情况以及其他情况都由适配层处理。

!!! 警告

```
适配层中做出的某些决定，说白了是抛硬币定下来的。如果你好奇某处为什么是这个样子，那多半是因为它总得做点什么。
```

我们再仔细看看类型是怎么处理的。

#### 借助 `ajv` 实现参数类型

虽然 `argparse` 允许使用方通过 API 定义各种参数&#x7684;_&#x7C7B;型_（例如字符串、数字、布尔标志等），但 Appium 基本避开了这些内置类型。\*为什么呢？\*原因是：

1. 我们已经知道参数的类型了，因为我们在 schema 里定义了它。
2. `ajv` 提供基于 schema 的校验。
3. 相比 `argparse` 原生能力，schema 能对类型、允许取值等做出更强的表达。
4. schema 的表达力更强，错误提示也就更准确。

为此，适配层舍弃了 `argparse` 的内置类型（参见 `ArgumentOption['type']` 允许的字符串取值），转而利用"可以把一&#x4E2A;_&#x51FD;&#x6570;_&#x4F5C;为 `type`"这一能力。唯一的例外&#x662F;_&#x5E03;&#x5C14;_&#x6807;志，它们没有 `type`，而是用`action: 'store_true'`。其中的原因，恐怕永远无人知晓。

##### 把函数当类型

当 `type` 是一个函数时，该函数同时负责校&#x9A8C;_&#x548C;_（必要时的）类型强制转换。那么这些函数到底是什么？

> 注意：如果属性的类型是 `boolean`，`ArgumentOption` 会省略 `type`（因此它不是函数），转而给出一个值为 `store_true` 的 `action` 属性。是的，这很奇怪。我也不知道为什么。

嗯……这取决于 schema。但一般而言，我们会创建一条函&#x6570;_&#x6D41;水线_，其中每个函数对应 schema 中的一个关键字。以 `port` 参数为例。我们没有去问操作系统 `appium` 运行能绑定哪些端口，而是期望该参数是 1 到 65535 之间的整数。这最终归结为两个函数，我们把它们组合成一条流水线：

1. 尽可能把值转换为整数。因为 _`process.argv` 中的每个值都是字符串_，所以我们想要数字就必须做强制转换。
2. 用 `ajv` 按 `port` 的 schema 校验这个整数。 Schema 允许我们通过 `minimum` 和 `maximum` 关键字定义取值范围。关于这部分如何工作的更多说明，请阅读下文。

与配置文件校验一样，如果检测到错误，Appium 会礼貌地告知用户，然后进程带着帮助文本退出。

对于那些天然不是原始类型的其他参数，事情就没这么简单了。

##### 转换器

还记得 `argparse` 不理解数组这件事吗？如果表达某个值最顺手的方式恰好就是一个数组呢？

Appium 无法在命令行上接受数组，尽管它在配置文件中可以接受数组。但 Appium _可&#x4EE5;_&#x63A5;受逗号分隔的字符串（一行 CSV），或者接受一个文件路径字符串，指&#x5411;_&#x5305;&#x542B;_&#x5206;隔列表的文件。无论哪种方式：当值离开参数解析器时，它应当已经是一个数组。

如前所述，JSON schema 的原生能力无法表达这一点。但可以定&#x4E49;_&#x81EA;定义关键字_，让 Appium 检测到并按相应方式处理。 Appium 正是这样做的。

具体来说，系统向 `ajv` 注册了一个自定义关键字 `appiumCliTransformer`。 `appiumCliTransformer` 的取值（截至本文撰写时）可以是 `csv` 或 `json`。在基础 schema 文件 `appium-config-schema.js` 中，如果想要这种行为，Appium 会写 `appiumCliTransformer: 'csv'`。

!!! 注意

```
schema 中任何类型为 `array` 的属性都会自动使用 `csv` 转换器。同理，类型为 `object` 的属性会使用 `json` 转换器。可以想象，`array` 也许会用得上 `json` 转换器，但除此之外，在 `array` 或 `object` 类型的属性上显式写 `appiumCliTransformer` 关键字并不是必需的。
```

适配层（还记得适配层吗？）会创建一条包含特殊"CSV 转换器"的流水线函数（转换器定义在 `lib/schema/cli-transformers.js`），并把这个函数作为传给 `argparse` 的 `ArgumentOption` 的 `type` 属性。这种情况下，schema 中的 `type: 'array'` 会被忽略。

!!! 注意

```
配置文件并不需要对值做任何复杂转换，因为它天然允许 Appium 精确声明自己想要什么。所以 Appium 不会对配置文件中的值做任何后处理。
```

不需要这种特殊处理的属性直接使用 `ajv` 来校验。这套机制需要一些解释，所以下面就讲。

#### 借助 `ajv` 校验单个参数

说到 JSON schema，我们通常会想："我有这么个 JSON 文件，要拿 schema 来校验它"。这没错，Appium 对配置文件干的正是这件事！但在校验参数时，Appium 并不这么做。

!!! 注意

```
在实现过程中，我曾想把所有参数塞进一个类似配置文件的数据结构里，然后一次性校验。我觉得那应该可行，但装满 CLI 参数的对象是一个扁平的键/值结构，而 schema 不是，所以这看起来自找麻烦。
```

相反，Appium 是针对 schema _内&#x90E8;_&#x7684;某个具体属性来校验一个值。为此它维护了一份 CLI 参数定义与其对应属性之间的映射。这个映射本身是一个 `Map`，键是该参数的唯一标识，值是 `ArgSpec`（`lib/schema/arg-spec.js`）对象。

`ArgSpec` 对象保存以下元数据：

| 属性名             | 说明                                                   |
| --------------- | ---------------------------------------------------- |
| `name`          | 参数的规范名称，对应 schema 中的属性名。                             |
| `extType?`      | 若适用，值为 `driver` 或 `plugin`                           |
| `extName?`      | 若适用，值为扩展名称                                           |
| `ref`           | 该属性在 schema 中计算得到的 `$id`                             |
| `arg`           | 在 CLI 上接受形式，不含前导短横线                                  |
| `dest`          | 解析后的参数对象中的属性名（即 `argparse` 的 `parse_args()` 返回结果中的键） |
| `defaultValue?` | 若适用，值为 schema 中 `default` 关键字定义的值                    |

当 schema 被[定稿](#schema-的加载)时，这个 `Map` 会被填上所有已知参数的 `ArgSpec` 对象。

因此，当适配层为参数的 `type` 构建函数流水线时，它手上已经有该参数的 `ArgSpec` 了。它会创建一个调用 `validate(value, ref)`（位于 `lib/schema/schema.js`）的函数，其中 `value` 是用户提供的任意
值，`ref` 是该 `ArgSpec` 的 `ref` 属性。其理念是：`ajv` 可以用它认识&#x7684;_&#x4EFB;意_ `ref` 来校验；schema中的每个属性都能被这个 `ref` 引用，无论它是否已定义。为了帮助理解，如果 schema 是：

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

那么 `foo` 的 `ref` 就是 `my-schema.json#/properties/foo`。假设我们的 `Ajv` 实例认识这个 `my-schema.json`，就可以调用它的 `getSchema(ref)` 方法（该方法返回的对象有个 `schema` 属性，不过方法名本身多少有点名不副实）得到一个校验函数；`schema.js` 中的 `validate(value, ref)` 调用的就是
这个校验函数。

!!! 注意

```
schema 规范说，schema 作者可以提供显式的 `$id` 关键字来覆盖这一点；Appium 目前不支持这样做。如有需要，扩展作者必须在不使用自定义 `$id` 的前提下谨慎使用 `$ref`。不过扩展的 schema 复杂到需要这种程度几乎不可能；连 Appium 自己定义属性时都没用到 `$ref`！
```

接下来看看 Appium 是如何加载 schema 的。这一步实际上发生在任何参数校&#x9A8C;_&#x4E4B;前_。

## Schema 的加载

我们先暂时抛开扩展，从基础 schema 说起。

当某个地方首次 import `lib/schema/schema.js` 模块时，会创建一个 `AppiumSchema` 实例。它是一个单例，模块导出的是它的各个方法（全部绑定到该实例上）。

构造函数做很少的事：它实例化一个 `Ajv`，用 Appium 的[自定义关键字](#自定义关键字参考)进行配置，并通过 [ajv-formats](https://npm.im/ajv-formats) 模块加入对 `format` 关键字的支持。

除此之外，在 `AppiumSchema` 实例的 `finalize()` 方法（以 `finalizeSchema()` 之名导出）被调用之前，
它不会与 `Ajv` 实例发生任何交互。当这个方法被调用时，等于在说"我们不会再添加更多 schema 了；请开始创建 `ArgSpec` 对象并向 `ajv` 注册 schema 吧"。

那定稿什么时候发生呢？是这样的：

1. `appium` 可执行文件启动时，&#x4F1A;_&#x68C0;查并配置 `APPIUM_HOME` 中的扩展_（这里先含糊带过）。
2. 然后它才开始考虑参数——实例化一个 `ArgParser`，而它（还记得吗）会运行适配层，把 schema 转换成参数。
3. _定稿就发生在这里_——即创建解析器的时候。 Appium 需要这些 schema 已注册到 `ajv`，才能为参数创建校验函数。
4. 随后，Appium 用 `ArgParser` 解析参数。
5. 最后，决定如何处理返回的对象。

即使没有扩展，`finalize()` 依然知道 Appium 的基础 schema（`appium-config-schema.js`），并注册它。但上面第 1 步可干了不&#x5C11;_&#x91CD;活_，所以我们来看看扩展是如何介入的。

## 扩展支持

这套系统的一个设计目标是：

_扩展应能够向 Appium 注册自定义 CLI 参数，而用户应能像使用任何其他参数一样使用它们。_

以前，Appium 是以另一种方式接受这些参数（通过 `--driverArgs`），但校验是手写的，还要求扩展实现方使用一套自定义 API。用户也不得不别扭地在命令行上传入一个 JSON 字符串作为配置。而且这些参数没有上下文帮助信息（通过 `--help` 看不到）。

如今，只要为其选项提供 schema，驱动或插件就能向 Appium 注册 CLI 参数和配置文件 schema。

要注册一个 schema，扩展必须在其 `package.json` 中提供 `appium.schema` 属性。其值可以是 schema 本身，也可以是指向 schema 的路径。若是后者，schema 应为 JSON 或一个 CommonJS 模块（暂不支持 ESM，也不支持 YAML）。

对于该 schema 中的每个属性，它都会以 `--<extension-type>-<extension-name>-<property-name>` 形式的 CLI 参数出现。例如，若 `fake` 驱动提供了一个 `foo` 属性，那么参数就是 `--driver-fake-foo`，并且会像其他任何 CLI 参数一样出现在
`appium server --help` 中。

配置文件中对应的属性则是 `server.<extension-type>.<extension-name>.<property-name>`，例如：

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

上面描述的命名约定避免了某一类扩展的名称与另一类扩展发生冲突的问题。

!!! 注意

```
虽然扩展可以通过 `appiumCliAliases` 提供别名，但不允许使用"短"标志，因为来自扩展的所有参数都以 `--<extension-type>-<extension-name>-` 为前缀。扩展名和参数名会按 [Lodash 关于kebab-case 的规则](https://lodash.com/docs/4.17.15#kebabCase)转换成 kebab-case 形式用于命令行。
```

schema 对象看起来会与 Appium 的基础 schema 很像，但它只有顶层属性（暂不支持嵌套属性）。示例：

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

写在用户的配置文件中时，它就是 `server.driver.cowabunga.fizz` 属性。

加载扩展时，系统会验证 `schema` 属性，并把该 schema 注册到 `AppiumSchema`（此&#x65F6;_&#x4E0D;&#x4F1A;_&#x6CE8;册到 `Ajv`，直到 `finalize()` 被调用才注册）。

在定稿阶段，每个已注册的 schema 都会被加入 `Ajv` 实例。 schema 会被赋予一个基于扩展类型和扩展名的 `$id`（这会覆盖扩展自己提供的 `$id`，如果有的话）。 schema 还会被强制通过 `additionalProperties: false` 关键字禁止未知参数。

在幕后，基础 schema 有两个类型为对象的属性：`driver` 和 `plugin`。定稿时会向各自添加一个属性——以扩展名命名——其值是指向该扩展 schema 中某属性 `$id` 的引用。例如 `server.driver` 属性看起来会是这样：

```json
{
  "driver": {
    "cowabunga": {
      "$ref": "driver-cowabunga.json"
    }
  }
}
```

这就是为什么我们把它称为"基础" schema——当扩展提供 schema 时它会&#x88AB;_&#x6539;写_。扩展的 schema 单独保存，但在最终加入 `ajv` 之前，会先&#x628A;_&#x5F15;&#x7528;_&#x6DFB;加进这个 schema。这样做行得通，是因为一个 `Ajv` 实例能够理解从它认识的任意 schema _指&#x5411;_&#x5B83;认识的任意 schema 的引用。

!!! 注意

```
这使得无法为 Appium _以及_已安装的扩展提供一份完整的静态 schema（截至 2021 年 11 月 5 日）。静态的 `.json` schema _会_由基础 schema 生成（通过一个 Gulp 任务），但它不包含任何扩展 schema。静态 schema 也有 Appium 之外的用途；例如 IDE 可以借此为配置文件提供上下文错误检查。这个问题要不要一起来解决呢？
```

就像我们在基础 schema 中查找某个特定参数的引用 ID 一样，来自扩展的参数的校验也走完全相同的路径。如果 `cowabunga` 驱动的 schema ID 是 `driver-cowabunga.json`，那么 `fizz` 属性就可以通过
`driver-cowabunga.json#/properties/fizz` 被任何注册到 `ajv` 的 schema 引用。而"基础" schema 的参数则以 `appium.json#properties/` 开头。

## 开发环境支持

在开发流程中，有几个额外任务被自动化了，以维护基础 schema：

- 作为转译之后的一个步骤，会由 `lib/schema/appium-config-schema.js` 生成 `lib/appium-config.schema.json`
- （除 Babel 生成的 CJS 对应物之外）。
- 该文件纳入版本控制。它会在这一步被 _复制_ 到本仓库的
- `build/lib/appium-config.schema.json` 。一个 pre-commit 钩子
- （见根 monorepo 中的 `scripts/generate-schema-declarations.js`）
- 会由上述 JSON 文件生成 `types/appium-config-schema.d.ts`。 `types/types.d.ts` 中的类型
- 依赖于该文件。该文件同样纳入版本控制。

## 自定义关键字参考

关键字定义在 `lib/schema/keywords.js` 中。

- `appiumCliAliases`：允许 schema 表达别名（例如某个 CLI 参数可以写成 `--verbose` 或 `-v`）。它是一个字符串数组，长度小于三个字符的项会以单短横线（`-`）而非双短横线（`--`）开头。注意，扩展提供的任何参数都会以双短横线开头，因为它们必须带 `--<extension-type>-<extension-name>-` 前缀。
- `appiumCliDest`：允许 schema 指定 `argparse` 解析后参数对象中的自定义属性名。若不设置，则是一个 camelCase 字符串。
- `appiumCliDescription`：允许 schema 覆盖参数在命令行帮助中展示的描述。它与 `appiumCliTransformer`（或 `array`/`object` 类型的属性）配合使用很有价值，因为"用命令行的用户能提供什么"与"用配置文件的用户能提供什么"之间存在显著差别。
- `appiumCliTransformer`：目前可选 `csv` 或 `json`。它们是自定义函数，用于对值做后处理。加载和校验配置文件时不会用到它们；其设计目标是让处理结果与直接使用配置文件时得到的对象一致（例如字符串数组）。 `csv` 用于逗号分隔字符串和 CSV 文件；`json` 用于原始 JSON 字符串和 `.json` 文件。
- `appiumCliIgnore`：若为 `true`，则该属性不支持通过 CLI 提供。
- `appiumDeprecated`：若为 `true`，该属性被视为"已废弃"，并会以这种方式向用户展示（例如在 `--help` 输出中）。注意 JSON Schema draft-2019-09 引入了新关键字 `deprecated`，如果升级到该 schema，我们应该改用它；届时 `appiumDeprecated` 也应标记为 `deprecated`。
