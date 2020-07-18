## 一个开发人员对于Appium的概述

在阅读这个此文档之前，请确保你已经阅读并理解了关于[Appium的基本概念](/docs/cn/about-appium/intro.md)，
以及关于如何参与[Appium贡献说明](https://github.com/appium/appium/blob/master/CONTRIBUTING.md)

### 技术愿景

Appium致力于成为一个移动JSONWP前端，实现最佳的应用自动化技术。仅此而已。我们想要采用所有不同的
但自带亮点的自动化引擎，通过制作Appium驱动程序来平滑它们的差异和瑕疵，同时将它们纳入Appium。这与
Selenium项目有异曲同工之妙。对于我们而言，我们想要每一个驱动都是一个独立的实体（单独的repo， 测试，
等等）即便它们使用共享库，这一举措会使Appium驱动程序的开发变得尽可能简单，而且不拘泥于样板。我们之所以
使用现今流行的JavaScript，因为它们无处不在，而且对于很多开发人员而言容易理解并易于贡献。

### 开发者社区

欢迎任何人成为Appium开发人员，你仅需要阅读此指南并把你的一些代码合并进来，那么你就成为了我们一员。
如果你坚持不懈并且广施善缘，我们将会把你升级为一名提交者，这样你能继续帮助社区发展而且省去很多纷繁复杂。
如果你在开发Appium的时候遇到疑问，请前往我们的开发人员社区`appium-developers@googlegroups.com`.
请注意，这是一个为_开发_疑问而设的邮件列表，而不是关于_使用_疑问或bug提交。 有关使用问题请前往[discuss.appium.io](https://discuss.appium.io)
Github问题跟踪只是用于bug提交和功能需求。

### 敏捷开发工作流程

Appium团队根据轻量化的scrum版本来运行开发。每两个星期我们开始一个新的“sprint”，或者每一段时间，我们
会决定团队下一阶段需要完成的事情。我们欢迎任何熟悉Appium代码库的人参加我们的sprint计划，并将视作SCRUM参与团队成员。
参与者无需是代码长期提交者。sprint期间，我们将在[Appium slack 团队](https://appium.slack.com)的
`#standup` 聊天室更新我们每个人的进程（没有实时的每天站立会议）。sprint结束时，我们将举行“回顾”活动，以此来
庆祝我们取得的成就并总结活动进展如何，这可能会生成一个关于如何进行不同尝试又或者如何做的更好的总结列表。

最终，我们的目标是在每一个sprint结束时发布一个Appium版本，也就是说每两个星期一个周期。我们还没有实现这个目标，但希望
我们能很快达成。

当前会议时间：
* sprint计划： 每两个周一 10:00 AM - 10:45 AM （太平洋时间）
* sprint回顾： 每三个周五 1:00 PM -  1:30 PM（太平洋时间）

我们使用[Zoom](https://zoom.us)视讯来举行会议

如果你有意参加sprint，你可以在Appium Slack群组里联系`@jlipps` 或者 `@isaac`，又或者直接在推特
上联系`@jlipps`，我们将会在下一次sprint里分享如何加入视频聊天。

### 构造

Appium主要是一个[node.js](http://nodejs.org)包的集合，以此组合形成一个运行的node.js服务器。
这些包都被单独维护并拥有各自的GitHub repo, CI和发布流程。一些软件包(比如 `appium-ios-driver`)
很大，并且给Appinum添加了很重要的功能。相比而言，其他软件包则扮演着一个辅助的角色，而且高度曝光其某个
特定并被反复使用的功能。

有关软件包的层次结构和每一个包所起的作用，请前往我们[包的概述](/docs/cn/contributing-to-appium/appium-packages.md)文档。

### 转化

Appium是用JavaScript的新形式编写的，称为ES6（或现在的ES2015）。因为这个版本的语言尚未被老版本
node.js的原生支持，Appium代码是_被移植_到ES5（JS更为广泛支持的版本）。这个转化过程必须发生在所有
代码运行之前。除了ES6的新语言特性，我们也从JS的_后续_版本中采用了很重要的关键词，`async` 和 `await`,
这有助于编写整洁的异步代码。因为这个代换的步骤，Appium软件包囊括了观察代码变化和重新编排代码的工具。
通常而言，同样的工具会自动运行单元测试，同时确保没有任何小的纰漏。大多Appium软件包在运行`gulp`的时候
把上述过程当做默认行为。

### 排查和代码风格

对于所有Appium的JS而言，代码外观和使用感觉同样重要。这包括样式常规，编码模式以及我们解决各种问题时使用的
库。你应该熟悉我们新的[ES2015 风格指南](/docs/cn/contributing-to-appium/style-guide.md)。
当转化时，Appium包将自动运行JSHint或其他lint工具，并在代码不符合我们规范的时候提供警告或错误反馈。
这些工具不一定能顾全我们关心的种种风格问题，所以我们在review代码的时候也应该注意代码规范问题。这不是
吹毛求疵，而是为了有一个整洁，一致并且可读的代码库。

### 提交代码

将你的代码提交到Appium很容易：你只需要提交一个pull请求到我们的repos并在代码review的过程中与我们的
维护者进行互动。我们对代码提交有一系列的要求（但是不用担心！如果下面所列的太过繁复，我们将会为你一一道来）。
那我们就从你提交PR的那一步开始吧：

* 参考其他代码的样式和我们的样式指南
* Atomic 提交 -- 每个逻辑变化进行一次提交（例如：确保你的提交不用进入组论即可以正常运行,而且它在任何指定提交下都应该正常运行）这通常意味着每个PR一个提交。你将想要非常熟悉的`git rebase -i` 和压缩。
* 没有合并提交：在提交你的PR之前，通常在最新的master之上进行rebase（或者其它你想要merge进去的branch）。
* 几乎所有的更改都应该有测试。关于漏洞修复，至少应该有单元测试以证明这个bug已被修复。新功能应该有单元测试，并且在大多数情况下进行e2e测试，以证明该功能正常工作。我们将乐意带你浏览测试的创建过程。阅读其他的测试代码会是一个很好的开始。我们的CI系统通常运行测试覆盖率统计，而且我们不大可能去合并那些会降低测试覆盖率的代码。

如果你在提交之前做了所有这些事情，你的代码将可能很快被接受。当然，如果你打算对Appium进行大量的改造工作，你可以联系开发人员，以确保这些改变符合我们的理念，这样在你开动之前确保我们会接受这些改动。

### 测试

始终确保你的更改已经被测试过！ 除了单测试和e2e测试，请确保在你开始进行更改和提交review之前，所有现有测试都被运行。
我们有为每一个Appium repo设置CI作为安全网，这样便于审阅者知晓代码是否已经通过测试。在任何Appium包运行测试都很容易！
以下是你可以做的事情（除非README另有说明）：

```
gulp                    # 监测目录下重编译代码更改，以及运行单元测试
gulp once               # 同上，当不提供监测
gulp unit-test          # 转化和运行单元测试
gulp e2e-test           # 转化以及运行端到端／功能测试
_FORCE_LOGS=1 <command> # 显示测试运行期间的模块日志输出
```

请注意，单元测试的文件后缀通常为 `-specs.js` ，而e2e测试文件后缀则为`-e2e-specs.js`.

### 发布

任何非Appium主包的发布流程都是非常简洁明了的（请注意：如果你想要发布它，你需要成为一个NPM的所有者。
所有权由Appium提交者管理； 如果你对所有者有任何疑问，请联系@jlipps 或者 @imurchie）。

0. `rm -rf node_modules && rm -rf package-lock.json && npm install` 并运行测试以确保全新安装正常工作
0. 根据[SemVer](http://semver.org/) 规则决定我们是否需要发布一个补丁（漏洞修复），微调（功能）或者是主要（迭代）(请参考 [how SemVer works with NPM](https://docs.npmjs.com/getting-started/semantic-versioning).
0. 通过任何适当的更改和提交来更新CHANGELOG以README文件。大多数子包没有CHANGELOG。
0. 通过适当的版本类型运行 `npm version <version-type>`
0. 将适当的分支推送到GitHub, 不要忘记加入`--tags` 来标记刚由 `npm version`创建的标志.
0. 运行 `npm publish` (如果不是正式版， 请使用`--tag beta`).

对于Appium的主包发布，上述步骤必须执行，但有以下改变。一个原因是对于主包，我们使用NPM收缩包装
以确保依赖在安装的时候不更改。另一个原因是我们在master上开发和各种分支上发布。它的工作方式
如下：我们经常在master上开发和增加新的代码。 当我们准备好了做一个新的次要或主要版本（例如`1.5.0`
或`2.0.0`），我们创建一个发布分支（分别为`1.5`或`2.0`）。然后我们发布该分支。 一旦我们认为需要修复补丁，
我们首先将补丁拉到master中，然后将单个补丁挑选到发布分支（甚至是多个发布分支）。 然后我们再次
从这些分支发布更新的补丁版本（例如`1.5.1`或`2.0.1`）。

**关于 `npm shrinkwrap`的注释：** 我们使用[npm shrinkwrap](https://docs.npmjs.com/cli/shrinkwrap)是为了在发布时锁定依赖关系。
没有它，任何依赖包上的开发将在安装Appium时反应出来，这可能会导致问题。 由于配置文件`npm-shrinkwrap.json`仅存在于发布分支上，
因此有必要在发布过程中手动管理它。 它需要与对`package.json`的更改一起提交到GitHub。

0. 如果 NPM shrinkwrap JSON 文件存在，请移除.
0. `rm -rf node_modules && rm -rf package-lock.json && npm install` 并运行测试以确保全新安装正常工作
0. `rm -rf node_modules && rm -rf package-lock.json && npm install --production` 以获取仅production部分.
0. `npm shrinkwrap` 来编写新的 NPM shrinkwrap JSON 文件.
0. 根据SemVer来决定我们是否需要发布一个补丁（漏洞修复），微调（功能）或者是主要（迭代）
0. 用合适的新版本信息来更新`package.json`
0. 对CHANGELOG/README进行合适的更改，同shrinkwrap 和 `package.json`的改变一起以PR的形式进行提交审核。待它被合并之后，把它`pull`进`release`分支。
0. 在发布分支（通常是一个小分支，如`1.5`或`1.4`）上创建一个形式为`v <version>`的标签：`git tag -av <version>`，例如`git tag -a 1.5.0`。 这对测试版本不是必需的。
0. 把标签推送到上游分支： `git push --tags <remote> <branch>`
0. 安装dev依赖 （或者至少`gulp` 和 `appium-gulp-plugins`）
0. 运行`npm publish`（如果这不是正式版本，请使用`--tag beta` ）。
0. 在appium.io更新文档。 从github的check out appium.io repo，check out`gh-pages`分支和并更新到最新版本。 然后运行`rake publish`。
0. 在GitHub上创建一个新版本：转到`https://github.com/appium/appium/releases/tag/v <VERSION>`并点击“编辑标签”。 输入发布名称为`<VERSION>`（例如，`2.0.5`），然后粘贴到更改日志（但不是此版本的changelog标题）。 如果是试用版，请标记为预发布。
0. 在 discuss.appium.io 创建新的帖子来宣布release. 请创建于 "News"类别. 粘贴在changelog和任何可选的评论。 置顶当前帖子并取消置顶上一个release帖子。
0. 开始发布`appium-desktop`。
0. 请告知 @jlipps，以便他可以发布一个链接到讨论帖子。

本文由 [ZhaoC](https://github.com/ZhaoC) 翻译，由 [oscarxie](https://github.com/oscarxie) 校验。
