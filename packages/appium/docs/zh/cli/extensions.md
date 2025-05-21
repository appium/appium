---
title: 扩展命令行用法
---

Appium允许灵活安装和管理各种扩展，例如驱动程序（为Appium提供自动化给定平台的能力）和插件（可以增强或改变单个Appium命令的工作方式）。
要从概念上理解这些实体，请查看[引言](../intro/index.md)。

驱动程序和插件的管理由Appium的扩展命令行处理。

!!! 注意

    这篇文档使用了占位符来指代各种选项。在参考文档中，任何时候你看到这些占位符，确保你用正确的实际内容替换它们。
    
|占位符|含义|
|--|--|
|`<ext-type>`|"Extension type"，它应该是`driver`或`plugin`；所有的扩展命令行都可以与驱动程序或插件一起使用，因此您必须指定将使用哪种类型的扩展。|
|`<ext-name>`|"Extension name"，这是对`appium <ext-type> list`的调用中找到的扩展名的简称；这与扩展的NPM包名不同，或者通常来说，与扩展的“安装规范”是有所区别的。|
|`<install-spec>`|"Install specification"，这是指用于指示Appium应安装什么扩展的字符串。|
|`<install-source>`|这是指Appium安装扩展程序应该使用的方法。|

## 命令

所有扩展命令行都以`appium <ext-type>`开头，即 `appium driver`或`appium plugin`。

所有扩展命令行都可以接受一个可选的`--json`参数，这个参数会让命令的输出结果以机器可读的JSON字符串形式返回，而不是标准的、为人类阅读优化的、带颜色的输出。

### `doctor`

运行给定扩展的医生检查，以验证扩展的先决条件是否配置正确。请注意，并非所有的扩展都包含医生检查工具。
有关如何创建它们的更多详细信息，请参阅[构建检查工具](../developing/build-doctor-checks.md)教程。

使用方法：

```
appium <ext-type> doctor <ext-name>
```

必须的参数：

- `<ext-type>`：必须为`driver`或`plugin`
- `<ext-name>`：您要运行医生检查的扩展名

可选的参数:

- `--json`：以JSON格式返回结果

示例（运行UiAutomator2驱动程序的医生检查）：

```
appium driver doctor uiautomator2
```

### `install`

安装一个扩展。如果安装成功，返回扩展的短名称，这个短名称可以在其他扩展命令行的调用中使用。如果扩展是一个驱动程序，还应该注明可以使用该驱动程序的平台。

使用方法：

```
appium <ext-type> install <install-spec> [--source=<install-source>] [--package=<package-name>] [--json]
```

必须的参数：

- `<ext-type>`：必须为`driver`或`plugin`
- `<install-spec>`：这是您要安装的扩展的名称、位置或版本。其可能的值取决于`<install-source>`（见下文）。

可选的参数：

- `--source`：告诉Appium如何定位您的扩展；查看下面的表格，了解可能的来源类型和相应的安装规范。
- `--package`：当`<install-source>`的值为`git`或`github`，`--package`参数是必须的. 它必须是扩展的Node.js包名称。缺少这些信息的话，Appium将无法定位到已安装的包。
- `--json`：以JSON格式返回结果

|安装源类型|行为|
|--|--|
|None|如果不使用`--source`选项，Appium将执行默认操作。此时，Appium会检查`<install-spec>`并将其与执行`appium <ext-type> list`命令时列出的扩展名称进行匹配，也就是与官方认可的扩展名称进行匹配。如果匹配成功，Appium将通过NPM安装该扩展的最新版本。|
|`npm`|根据扩展的NPM包名来安装扩展。在这里，`<install-spec>`必须包含NPM包名以及任何附加的NPM安装修饰符，例如版本号（参见下文）。|
|`github`|通过`<org>/<repo>`格式的GitHub规范安装扩展|
|`git`|通过Git URL安装扩展（例如：`git+ssh://git-host.com/repo.git`）|
|`local`|通过本地路径安装扩展。这必须是驱动程序的Node.js包信息所在目录的路径。|

#### 基于NPM安装 `<install-spec>`

当Appium通过NPM安装扩展（即当`--source`参数被省略或设置为`npm`时），`<install-spec>`可以非常复杂，并且可以包括`npm install`所允许的任何形式的信息：

- `[@scope]/<name>`
- `[@scope]/<name>@<version>`
- `[@scope]/<name>@<tag>`
- `[@scope]/<name>@<version range>`

#### 示例

- 安装最新的XCUITest驱动程序：

    ```
    appium driver install xcuitest
    ```

- 安装4.11.1版本的XCUITest驱动程序：

    ```
    appium driver install xcuitest@4.11.1
    ```

- 从NPM安装`beta`版本的`@appium/fake-driver`：

    ```
    appium driver install --source=npm @appium/fake-driver@beta
    ```

- 安装本地开发的插件：

    ```
    appium plugin install --source=local /path/to/my/plugin
    ```

### `list`

列出已安装和可用的扩展。可用扩展包括Appium团队正式认可的扩展，但您不仅限于安装此列表中显示的扩展。

使用方法：

```
appium <ext-type> list [--installed] [--updates] [--json]
```

必须的参数：

- `<ext-type>`：必须为`driver`或`plugin`

可选的参数：

- `--installed`：仅显示已安装的扩展程序，而不是已安装和可用的扩展程序
- `--updates`：对于通过NPM安装的扩展，如果有任何更新，则显示一条消息
- `--json`：以JSON格式返回结果

### `run`

运行扩展包中包含的脚本。扩展作者可以包含可运行的脚本，以协助设置或执行其他任务。这些脚本由扩展作者命名（本指南中称为`<script-name>`），通常会在扩展文档中加以说明。

使用方法：

```
appium <ext-type> run <ext-name> [--json] <script-name> [script-args]
```

必须的参数：

- `<ext-type>`：必须为`driver`或`plugin`
- `<ext-name>`：要运行脚本的扩展名
- `<script-name>`：扩展发布的脚本的名称

可选的参数：

- `script-args`：任何Appium无法识别为其自身参数集的参数，都将传递给扩展脚本
- `--json`：以JSON格式返回结果

示例（运行UiAutomator2驱动程序附带的`reset`脚本）：

```
appium driver run uiautomator2 reset
```

### `update`

更新通过NPM安装的一个或多个扩展。默认情况下，Appium不会自动更新超过主要版本边界的任何扩展，以防止意外的破坏性更改。

使用方法：

```
appium <ext-type> update <ext-name> [--unsafe] [--json]
```

必须的参数：

- `<ext-type>`：必须为`driver`或`plugin`
- `<ext-name>`：要更新的扩展名或已安装的字符串（将更新所有已安装的扩展）

可选的参数：

- `--unsafe`：允许Appium更新到超越主要版本界限的版本
- `--json`：以JSON格式返回结果

### `uninstall`

删除已安装的扩展。

使用方法：

```
appium <ext-type> uninstall <ext-name> [--json]
```

必须的参数：

- `<ext-type>`：必须为`driver`或`plugin`
- `<ext-name>`：要卸载的扩展程序的名称

可选的参数：

- `--json`：以JSON格式返回结果
