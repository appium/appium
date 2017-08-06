## 如何编写文档

`##`用于写一个h2头。 每个文档必须以h2开头。这是为了支持appium.io文档生成。不要使用`---`下划线方法创建标题。
不要对标题使用h1`#`或`===`，因为它不支持目录（文件夹名称用作h1）。

### 副标题

`###` 用于编写副标题

### 常规标题

`####` 用于不出现在目录里的标题。 
不要使用h5 `#####`或者h6`######`

### 换行符

不要使用 `--` 或者 `---`这样的换行符。 这样会混淆版面。

### 链接

链接到 readme :

`[readme](../../README.md)`

链接到贡献榜：

`[contributing](../../CONTRIBUTING.md)`

链接到另一个文件

`[link text](filename.md)`

如果想链接文件内部，请使用`#` 作为版面URL

`[go direct to json](filename.md#json-wire-protocol-server-extensions)`

请注意，当标题改变时，哈希链接会被破坏掉。所以更好的选择是链接到文件的开头（用`other.md` 取代 `other.md#something`）

### 与appium.io的兼容性

### 在appium.io里中居对齐代码

Appium.io文档使用[slate]（https://github.com/tripit/slate）获取文档。
如果文档中的代码段不是特定的语言，或者你希望代码段保留在appium.io文档的居中部分，请使用`center`作为代码区的后缀。

例如：

    ```center
    代码段放置于此。
    ```

#### 出版

要在appium.io上发布文档，请参阅[api-docs](https://github.com/appium/api-docs) 和 [appium.io](https://github.com/appium/appium.io).

本文由 [ZhaoC](https://github.com/ZhaoC) 翻译，由 [oscarxie](https://github.com/oscarxie) 校验。
