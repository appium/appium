---
hide:
  - navigation

title: ""
---

As such, we welcome contributions!

There are a lot of different ways to help the project - see below for everything you can do and the
processes to follow for each contribution method. 加入讨论论坛

## 你无需了解 Appium 的内部实现就能做出贡献！如果你有使用 Appium 的经验并愿意分享，请考虑在 Appium 论坛（discuss.appium.io）帮助其他用户。去看看是否有你能回答的问题。

报告错误或功能请求 如果你遇到错误，或有希望 Appium 支持的新功能，请在我们的 GitHub issue 跟踪器中告知我们。创建 issue 时请使用合适的问题表单模板。

## 除了创建 issue 之外，你还可以帮助我们调查已报告的问题。你只需对 Appium 有足够的熟悉度以便尝试复现 bug。

If you've encountered a bug, or have a cool feature in mind that you think Appium should support,
make sure to let us know at our [GitHub issue tracker](https://github.com/appium/appium/issues).
你无需了解 Appium 的内部实现也可以参与贡献！如果你有使用 Appium 的经验并愿意分享，请考虑在 Appium 论坛（discuss.appium.io）帮助其他用户。去看看是否有你可以回答的问题。

## 报告缺陷或功能需求

如果你遇到错误，或有希望 Appium 支持的新功能想法，请在我们的 GitHub 问题跟踪器中告诉我们。创建问题时请使用相应的问题表单模版。 问题分级（Triage Issues）

除了创建问题，你也可以帮助我们调查已报告的问题。你只需对 Appium 有足够的熟悉度以尝试重现这些问题。

- If the issue is a duplicate, drop a link to the original issue
- 需要分类（Needs Triage）
- 需要信息（Needs Info）

如果该问题是重复的，请附上原始问题的链接

## 如果用户未提供足够的信息（例如 Appium 日志），请向他们索取更多细节

如果你能在自己的环境中重现该问题，请提供所有你认为有助于我们查找原因的信息

!!! info

    关于为 Appium（任何 Appium 项目仓库）进行问题分类的更多信息，请联系任意一位技术委员会成员。

贡献代码

```sh
我们欢迎通过拉取请求（pull requests）来改进 Appium 的代码或文档！
```

!!! info

    开发者信息可能不会像面向用户的信息那样频繁更新，或在当前发布版本中并非始终适用。请务必查看在线仓库或与维护者讨论。我们很乐意帮助新贡献者入门！

首先克隆仓库（推荐先 fork）：

```sh
git clone https://github.com/appium/appium.git
cd appium
```

如果你是 VS Code 用户，可以使用 [Runme](https://runme.dev/api/runme?repository=https%3A%2F%2Fgithub.com%2Fappium%2Fappium.git&fileToOpen=packages%2Fappium%2Fdocs%2Fen%2Fcontributing%2Findex.md) 轻松检出该项目。

安装依赖：

```sh
npm install
```

接下来你可以做几件事情。

```sh
构建项目：
```

npm run build

```sh
构建项目并监听更改：
```

npm run dev

```sh

```

npm start

```sh
运行各种测试：
```

### npm run lint&#xA;npm run test:unit&#xA;npm run test:types&#xA;npm run test:smoke&#xA;npm run test:e2e&#xA;npm run test:quick # unit 和 types&#xA;npm run test:slow # 全部测试

你也可以为特定工作区运行测试，例如：
export APPIUM_WORKSPACE=@appium/base-driver
npm run test:unit -w $APPIUM_WORKSPACE 文档

本项目的文档位于项目仓库中，采用 Markdown 文件形式，由 @appium/docutils 模块的文档系统构建。该模块基于 MkDocs，因此需要在系统上安装 Python。

```sh
@appium/docutils
```

安装 Python 依赖：

```sh
npm run install-docs-deps
```

在完成修改后，你可以以开发模式运行文档服务器：

## npm run dev:docs

然后可以在 http://127.0.0.1:8000/docs/en 查看文档。 http://127.0.0.1:8000/docs/en

### 如果你希望参与将 Appium 文档翻译成你的语言，请加入 Appium Documentation Crowdin 项目的翻译者组并开始翻译。如果你发现可用的 Crowdin 语言列表中缺少你的语言，请创建 issue 告知我们。

Appium 文档翻译（非英语语言）的流程是自动化的，由 Crowdin 翻译管理系统完成。不要直接在 GitHub 上编辑任何已翻译的文档，因为它们将在即将的同步中被 Crowdin 导出的版本覆盖。 从何开始

### Source Language Updates

Changes in documents are synchronized to Crowdin automatically via the `Update Crowdin English Docs` GitHub action.
This action is triggered automatically as soon as there are any changes under `packages/appium/docs/en/**.md`
or `packages/appium/docs/mkdocs-en.yml`.

### Fetching Translated Documents

In order to fetch translated files from Crowdin to the GitHub repository it is necessary to trigger
the `Sync Crowdin Docs Translations` action. This action should also automatically create a PR with
corresponding translated resources included.
