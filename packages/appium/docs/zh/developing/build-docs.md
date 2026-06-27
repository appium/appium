---
title: 构建文档
---

一旦你为 Appium 构建了 [驱动](./build-drivers.md) 或 [插件](./build-plugins.md)，通常也会希望为用户说明这个扩展是如何工作的。 最基础的方式就是编写一个简短的 `README.md`，并将它放在项目仓库的根目录中。
不过，这样做可能会耗费不少精力。

Appium 项目已经提供了辅助工具，并且我们把这些工具打包好了，以便生态系统中的驱动和插件开发者也能使用。 这些工具最好的入门方式是查看一个现有的 Appium 驱动仓库，看看它是如何组织文档的，例如 [XCUITest 驱动仓库](https://github.com/appium/appium-xcuitest-driver)。 不过，本指南会先介绍基本的实现思路。

### 概念架构

Appium 采用 [MkDocs](https://www.mkdocs.org/) 作为基于 Markdown 的文档站点的生成工具。 它使用 Python 工具链（而不是 Node.js），但这恰好是我们当前需求下最合适的选择。 你可以自行调整，不过默认情况下，Appium 的工具链也会假设你使用 [mkdocs-material](https://squidfunk.github.io/mkdocs-material/) 主题与扩展来搭建 MkDocs。

为了让你的文档能够支持不同版本（通常是每个小版本一个），我们还会捆绑 [Mike](https://github.com/jimporter/mike)。

从这里开始，构建一个基础文档站点其实很简单：把 Markdown 文件收集起来，再定义你希望它们如何组织即可。

### 前置条件

要使用 Appium 的文档工具，你需要安装以下内容：

- [Python v3+](https://www.python.org/downloads/)
- [pip](https://pip.pypa.io/en/stable/installation/)（通常 Python 会自动附带安装）
- `@appium/docutils` 包：

  ```bash
  npm install --save-dev @appium/docutils
  ```

### 初始化用于构建文档的扩展

要为你的扩展准备文档生成环境，请运行下面的命令：

```bash
npx appium-docs init
```

这一步会：

1. 创建一个 `tsconfig.json`（如果当前还没有的话）。 即使你的扩展并不是 TypeScript 编写的，这也是必需的。
2. 创建一个 `mkdocs.yml`，其中包含 MkDocs 所需的配置。

### 为你的扩展编写文档

此时你就可以开始为扩展编写文档了。 默认情况下，MkDocs 会在 `docs` 目录中查找 Markdown 文件。 因此，你可以创建文档文件并放入 `docs`，然后在 `mkdocs.yml` 里添加相应链接。

请参考 [MkDocs 文档](https://www.mkdocs.org/user-guide/writing-your-docs/) 来了解如何组织与构建你的文档结构。

### 构建文档

在这个阶段，你可以使用 `appium-docs` CLI 工具。 运行这个工具时不传任何参数，可以看到完整的帮助信息，以及所有可用的子命令与参数。 下面是几个常见用法示例：

```bash
# 生成参考文档并将 mkdocs 站点构建到 site 目录
npx appium-docs build

# 与 build 相同，但会在本地启动开发服务器
# 并监听文件变化，在内容变更时自动重建
npx appium-docs build --serve

# 构建文档并使用 mike 进行版本化部署到 docs-site 分支
# 其中包含内置提交信息。
# 这对于把内容推送到 GitHub Pages 分支特别有用！
npx appium-docs build \
  --deploy \
  -b docs-site \
  -m 'docs: auto-build docs for appium-xcuitest-driver@%s'
```
