## 如何编写文档

`##`用于写一个 h2 头。每个文档必须以 h2 开头。
这是为了支持 appium.io 文档生成。不要使用`---`下划线方法创建标题。
不要对标题使用 h1 `#` 或 `===`，因为目录表不支持这样（文件夹名称将用作 h1）。

### 副标题

`###` 用于编写副标题

### 常规标题

`####` 用于不出现在目录里的标题。 
不要使用 h5 `#####` 或是 h6 `######`。

### 换行符

不要使用 `--` 或者 `---`这样的换行符。

### 链接

链接到 readme :

`[readme](../../README.md)`

链接到捐赠：

`[捐赠](../../CONTRIBUTING.md)`

链接到另一个文件

`[链接文本](filename.md)`

### 写指令（Commands）文档

指令文档位于 `docs/en/commands`，是程序生成的文档，不需要直接编辑。该指令文档定义在`commands-yml/commands`。

### 生成指令（Commands）文档
运行 `npm run generate-docs` 生成指令文档。这将在 `docs/en/commands` 下生成 Markdown 文件，然后需要将生成的文件提交并推送。

### 添加文档到 Appium.io
`docs/` 目录下的 Markdown 文件不会自动添加到站点。为了添加文档到 [appium.io](https://appium.io)，你需要在目录表（[toc.js](https://github.com/appium/appium/blob/master/docs/toc.js)）中的合适的位置添加一个入口。


#### 出版

要在 [appium.io](https://appium.io) 上发布文档，请参阅 [appium.io](https://github.com/appium/appium.io).

---
EOF.

本文由 [ZhaoC](https://github.com/ZhaoC) 翻译，由 [oscarxie](https://github.com/oscarxie) 校验。

翻译：@[Pandorym](https://github.com/Pandorym)
Last english version: be2acb207c07503b9b1af3ba9315e7bee092a55a, Feb 12, 2018
