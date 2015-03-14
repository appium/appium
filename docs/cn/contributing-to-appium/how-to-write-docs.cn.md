## 如何去写文档

`##` 被用于写第二级标题。每个文档必须以第二级标题开头。
这是为了支持appium.io文档的生成，不要使用下划线`---`的方式来创建标题。
不要使用第一级标题或者 `===` 底线方式来创建标题（其中文件夹名字被用于第一级标题）

### 小标题

`###` 用于小标题。

### 普通标题

`####` 用于不会出现在目录中的标题。
不要使用第五级标题 `#####`, 或者第六级标题 `######`。

### 分隔线

不要使用分隔线例如 `--` 或者 `---`。 这会使 Slate 混乱。

### 链接

链接到 readme：

`[readme](../../README.md)`

链接到 contributing:

`[contributing](../../CONTRIBUTING.md)`

链接到其他文档：

`[link text](filename.md)`

链接到文档的内部, 使用 `#` 来标记 Slate 链接。

`[go direct to json](filename.md#json-wire-protocol-server-extensions)`

需要注意的是当标题改变时，哈希链接会损坏。所以链接到文档的开头是最好的( `other.md` 替换 `other.md#something` )。

### appium.io兼容性

#### 在appium.io中心对齐代码

  Appium.io中文档使用 [slate](https://github.com/tripit/slate) 来作为文档标准
  如果在文件中的代码段不是特定语言或如果你想要代码片段保持与文本中心对齐在 appium.io 文档中，请把代码块放在中心位置
  例子：
      ```中心
      代码片段放在这里
      ```
#### 发布
  发布文档请在appium.io中查看 [api-docs](https://github.com/appium/api-docs) 和
  在 [appium.io](https://github.com/appium/appium.io) 中查看。


  
  
  

