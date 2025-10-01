---
hide:
  - 导航栏

title: 对Appium 的贡献
---

Appium项目离不开来自公司和志愿者的代码、文档、维护和支持的众多贡献。 因此，我们欢迎贡献！

有许多不同的方式可以帮助项目——请参阅下方了解您可以做的一切以及每个贡献方法的流程。 请注意，无论您如何贡献，您的参与都受我们的[行为准则](https://github.com/appium/appium/blob/master/CONDUCT.md)管辖。

## 加入讨论论坛

您不需要了解Appium的内部机制就能做出贡献！ 如果您有使用Appium的经验，并愿意与他人分享您的知识，请考虑在Appium论坛[discuss.appium.io](https://discuss.appium.io/)上帮助用户。 快去看看是否有您能回答的问题。

## 报告错误或功能请求

如果您遇到了一个bug，或者有一个很酷的功能想法，认为Appium应该支持，请务必在我们的[GitHub issue tracker](https://github.com/appium/appium/issues)上告诉我们。
请在创建issue时使用适当的issue表单模板。

## 对问题分类

除了创建issue，您还可以帮助我们调查已报告的问题。 您只需要对Appium有足够的熟悉程度来尝试重现bug。

您可以通过检查我们的[GitHub issue tracker](https://github.com/appium/appium/issues)中带有标签如`Needs Triage`或`Needs Info`的问题开始，并留下相关评论：

- 如果问题是重复的，请提供指向原始issue的链接
- 如果用户没有提供足够的信息（如Appium日志），请向他们询问更多细节
- 如果您能在自己的环境中重现问题，请提供您认为有助于我们追踪问题原因的所有信息

有关对Appium问题进行分类的更多信息（适用于任何Appium项目仓库），请联系[技术委员会](https://github.com/appium/appium/blob/master/GOVERNANCE.md#the-technical-committee)的任何成员。

## 贡献代码

我们始终欢迎用于改进Appium代码或文档的拉取请求！

!!! info

    开发者信息可能不像面向用户的信息那样频繁更新，或者它在在线仓库中的当前形式可能最相关，而不是在这个发布的版本中。请务必检查仓库或与维护者讨论。我们很乐意帮助新贡献者入门！

首先克隆仓库（我们建议先[fork](https://github.com/appium/appium/fork)
它）：

```sh
git clone https://github.com/appium/appium.git
cd appium
```

!!! info

    如果您是 VS Code 用户，您可以使用  [Runme](https://runme.dev/api/runme?repository=https%3A%2F%2Fgithub.com%2Fappium%2Fappium.git&fileToOpen=packages%2Fappium%2Fdocs%2Fen%2Fcontributing%2Findex.md) 轻松地查看项目。

安装依赖：

```sh
npm install
```

接下来你可以做几件事情。

构建项目：

```sh
npm run build
```

构建项目并监视更改：

```sh
npm run dev
```

启动本地 Appium 服务器：

```sh
npm start
```

运行测试：

```sh
npm run lint
npm run test:unit
npm run test:types
npm run test:smoke
npm run test:e2e
npm run test:quick # unit and types
npm run test:slow # everything
```

您也可以运行特定工作区的测试，例如：

```sh
export APPIUM_WORKSPACE=@appium/base-driver
npm run test:unit -w $APPIUM_WORKSPACE
```

### 文档

此项目的文档位于项目[仓库本身](https://github.com/appium/appium/tree/master/packages/appium/docs)中。
它包含在Markdown文件中，这些文件由`@appium/docutils`模块中的文档系统构建。 该模块基于[MkDocs](https://www.mkdocs.org/)，因此需要在您的系统上安装[Python](https://www.python.org/)。

安装 Python 依赖：

```sh
npm run install-docs-deps
```

安装 Python 依赖：

```sh
npm run dev:docs
```

然后你可以在 `http://127.0.1:8000/docs/en` 中查看文档。

## 翻译Appium 文档

Appium文档本地化为英语以外语言的过程是自动化的，通过[Crowdin翻译管理系统](https://crowdin.com)完成。 请勿直接在GitHub Appium仓库中编辑任何翻译文档，因为它们将在即将进行的同步中被从Crowdin导出的文档替换。

### 从哪里开始

如果您想为Appium文档翻译成您的语言做出贡献，只需加入[Appium Documentation](https://crowdin.com/project/appium-documentation) Crowdin项目的翻译者组，然后在那里开始翻译文档。 如果您看到您的语言在Crowdin可用语言列表中缺失，请通过创建[issue](https://github.com/appium/appium/issues)告诉我们。

### 源语言更新

文档中的更改通过 `Update Crowdin English Docs GitHub` action自动同步到Crowdin。
一旦 `packages/appium/docs/en/**.md` 或 `packages/appium/docs/mkdocs-en.yml` 下有任何更改，此action就会自动触发。

### 获取翻译文档

为了从Crowdin获取翻译文件到GitHub仓库，需要触发 `Sync Crowdin Docs Translations` action。 此action还会自动创建一个包含相应翻译资源的PR。
