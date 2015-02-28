# 如何写文档

`#` 用于第一级标题。每个文档必须以第一级标题开头。
不要使用 `===` 底线方法来创建标题。

## 第二级标题

`##` 用于第二级标题。 不要使用 `---` 底线方法来创建第二级标题标题。

### 普通标题

`###` 用于不会出现在目录中的标题。
不要使用第四级标题 `####`, 第五级标题 `#####`, 或者第六级标题 `######`。

### 分隔线

不要使用分隔线例如 `--` 或者 `---`。 这会使 Slate 混乱.

### 链接

链接到 readme:

`[readme](../../README.md)`

链接到 contributing:

`[contributing](../../CONTRIBUTING.md)`

链接到其他文档：

`[link text](filename.md)`

链接到文档的内部, 使用 `#` 来标记 Slate 链接.

`[go direct to json](filename.md#json-wire-protocol-server-extensions)`

需要注意的是当标题改变时，哈希链接会损坏。所以链接到文档的开头是最好的( `other.md` 替换 `other.md#something` )。
